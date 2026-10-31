-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BOOKING_UPDATED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notifyBooking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notifyEmail" BOOLEAN NOT NULL DEFAULT false;
