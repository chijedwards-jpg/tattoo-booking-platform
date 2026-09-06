/*
  Warnings:

  - Added the required column `passwordHash` to the `Artist` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Artist" ADD COLUMN     "passwordHash" TEXT NOT NULL;
