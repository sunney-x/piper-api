import { PrismaClient } from "@prisma/client";
import { env } from "../../env/server.mjs";

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["query"],
  });

export default prisma;

if (env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
