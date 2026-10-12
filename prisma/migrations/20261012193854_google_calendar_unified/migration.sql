-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "googleEventId" TEXT;

-- AlterTable
ALTER TABLE "Artist" DROP COLUMN "googleCalendarId";

-- AlterTable
ALTER TABLE "GoogleCalendarConnection" ALTER COLUMN "calendarId" DROP DEFAULT;
