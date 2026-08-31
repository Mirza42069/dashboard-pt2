import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { emitKeypressEvents } from "node:readline";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import dotenv from "dotenv";

import { isValidAccountName, normalizeUsername } from "../packages/auth/src/username";

dotenv.config({ path: fileURLToPath(new URL("../apps/web/.env", import.meta.url)) });

function required(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function readPassword(prompt: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Password input requires an interactive terminal.");
  }

  return new Promise((resolve, reject) => {
    let password = "";
    emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    stdout.write(prompt);

    const finish = (error?: Error) => {
      stdin.off("keypress", onKeypress);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write("\n");
      if (error) reject(error);
      else resolve(password);
    };

    const onKeypress = (character: string, key: { ctrl?: boolean; meta?: boolean; name?: string }) => {
      if (key.ctrl && key.name === "c") {
        finish(new Error("Admin seed cancelled."));
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        finish();
        return;
      }
      if (key.name === "backspace") {
        password = password.slice(0, -1);
        return;
      }
      if (character && !key.ctrl && !key.meta && character >= " ") password += character;
    };

    stdin.on("keypress", onKeypress);
  });
}

async function main() {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("db:seed-admin must be run locally in an interactive terminal.");
  }

  const prompt = createInterface({ input: stdin, output: stdout });
  const organizationName = required(await prompt.question("Organization name: "), "Organization name");
  const organizationCode = required(await prompt.question("Organization code: "), "Organization code")
    .toUpperCase()
    .replace(/\s+/g, "-");
  const defaultCurrency = required(
    await prompt.question("Default currency (ISO 4217, e.g. USD): "),
    "Default currency",
  ).toUpperCase();
  const legalEntityName =
    (await prompt.question(`Legal entity name [${organizationName}]: `)).trim() || organizationName;
  const legalEntityCode =
    (await prompt.question(`Legal entity code [${organizationCode}]: `)).trim().toUpperCase() ||
    organizationCode;
  const bankAccountName = required(
    await prompt.question("Initial bank account name: "),
    "Initial bank account name",
  );
  const bankAccountCode = required(
    await prompt.question("Initial bank account code: "),
    "Initial bank account code",
  ).toUpperCase();
  const adminName = required(await prompt.question("Admin name: "), "Admin name");
  const email = required(await prompt.question("Admin email: "), "Admin email").toLowerCase();
  const displayUsername = required(await prompt.question("Admin username: "), "Admin username");
  prompt.close();

  if (!/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(organizationCode)) {
    throw new Error("Organization code must be 2-32 letters, numbers, underscores, or hyphens.");
  }
  if (!/^[A-Z]{3}$/.test(defaultCurrency)) {
    throw new Error("Default currency must be a three-letter ISO 4217 code.");
  }

  if (!isValidAccountName(displayUsername)) {
    throw new Error("Admin username must be 1-120 printable characters and cannot contain '@'.");
  }
  const username = normalizeUsername(displayUsername);

  const password = await readPassword("Admin password (12-128 characters): ");
  const passwordConfirmation = await readPassword("Confirm admin password: ");
  if (password !== passwordConfirmation) throw new Error("Passwords do not match.");
  if (password.length < 12 || password.length > 128) {
    throw new Error("Password must be 12-128 characters.");
  }

  const [{ default: prisma }, { createSeedAuth, credentialIssuer, hashSeedPassword }] =
    await Promise.all([
      import("../packages/db/src/index"),
      import("../packages/auth/src/bootstrap"),
    ]);

  try {
    const matchingUsers = await prisma.user.findMany({
      where: { OR: [{ email }, { username }] },
    });
    if (matchingUsers.length > 1) {
      throw new Error("The email and username belong to different users; resolve the conflict first.");
    }

    let user = matchingUsers[0];
    if (!user) {
      const seedAuth = createSeedAuth(prisma);
      const result = await seedAuth.api.signUpEmail({
        body: {
          name: adminName,
          email,
          password,
          username,
          displayUsername,
        },
      });
      user = await prisma.user.findUniqueOrThrow({ where: { id: result.user.id } });
    }

    const passwordHash = await hashSeedPassword(password);
    const organization = await prisma.$transaction(async (tx) => {
      const savedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          name: adminName,
          email,
          emailVerified: true,
          username,
          displayUsername,
          role: "super_admin",
          mustChangePassword: false,
        },
      });

      await tx.account.upsert({
        where: {
          issuer_accountId: {
            issuer: credentialIssuer,
            accountId: savedUser.id,
          },
        },
        update: {
          userId: savedUser.id,
          providerId: "credential",
          password: passwordHash,
        },
        create: {
          id: randomUUID(),
          issuer: credentialIssuer,
          accountId: savedUser.id,
          providerId: "credential",
          userId: savedUser.id,
          password: passwordHash,
        },
      });

      const savedOrganization = await tx.organization.upsert({
        where: { code: organizationCode },
        update: { name: organizationName, defaultCurrency },
        create: { name: organizationName, code: organizationCode, defaultCurrency },
      });

      await tx.organizationMembership.upsert({
        where: {
          organizationId_userId: {
            organizationId: savedOrganization.id,
            userId: savedUser.id,
          },
        },
        update: { role: "OWNER" },
        create: {
          organizationId: savedOrganization.id,
          userId: savedUser.id,
          role: "OWNER",
        },
      });

      const legalEntity = await tx.legalEntity.upsert({
        where: {
          organizationId_code: {
            organizationId: savedOrganization.id,
            code: legalEntityCode,
          },
        },
        update: { name: legalEntityName, baseCurrency: defaultCurrency, isActive: true },
        create: {
          organizationId: savedOrganization.id,
          name: legalEntityName,
          code: legalEntityCode,
          baseCurrency: defaultCurrency,
        },
      });

      await tx.ledgerAccount.upsert({
        where: {
          organizationId_code: {
            organizationId: savedOrganization.id,
            code: bankAccountCode,
          },
        },
        update: {
          legalEntityId: legalEntity.id,
          name: bankAccountName,
          type: "BANK",
          currency: defaultCurrency,
          isActive: true,
        },
        create: {
          organizationId: savedOrganization.id,
          legalEntityId: legalEntity.id,
          code: bankAccountCode,
          name: bankAccountName,
          type: "BANK",
          currency: defaultCurrency,
        },
      });

      return savedOrganization;
    });

    console.log(`Seeded super admin ${email} for ${organization.name} (${organization.code}).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Admin seed failed.");
  process.exitCode = 1;
});
