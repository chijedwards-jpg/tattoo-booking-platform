import { prisma } from "@/lib/db";
import { getSessionArtistId } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Card } from "../../../ui";
import ReviewActions from "./ReviewActions";
import DepositStatus from "./DepositStatus";

export const dynamic = "force-dynamic";

export default async function SubmissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const artistId = await getSessionArtistId();
  if (!artistId) redirect("/login");

  const submission = await prisma.submission.findUnique({
    where: { id: params.id },
    include: { client: true, artist: true, appointment: true },
  });

  // Not found, or belongs to a different artist — same 404 either way, so
  // we don't reveal to a logged-in artist that a submission ID exists but
  // isn't theirs.
  if (!submission || submission.artistId !== artistId) return notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dashboard/submissions" className="flex items-center gap-1 text-sm text-grey hover:text-ink">
        <ChevronLeft size={15} /> All submissions
      </Link>

      <h1 className="mt-4 font-display text-3xl text-ink">{submission.client.email}</h1>
      <p className="mt-1 text-sm text-grey">
        Submitted {new Date(submission.createdAt).toLocaleString()}
      </p>

      {submission.inspirationImages[0] && (
        <img
          src={submission.inspirationImages[0]}
          className="mt-6 aspect-square w-full rounded-2xl object-cover"
        />
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Field label="Placement" value={submission.placement} />
        <Field label="Size" value={submission.sizePreset ?? `${submission.sizeInches ?? "—"} in`} />
        <Field label="Reference freedom" value={`${submission.referenceFreedom}% artist's interpretation`} />
        <Field label="Detected style" value={submission.aiDetectedStyle ?? "—"} />
        <Field label="AI complexity" value={submission.aiComplexity ? `${submission.aiComplexity}/10` : "—"} />
        <Field
          label="AI confidence"
          value={submission.aiConfidence ? `${Math.round(submission.aiConfidence * 100)}%` : "—"}
        />
      </div>

      {submission.description && (
        <div className="mt-6">
          <p className="font-mono text-[11px] uppercase tracking-wide text-grey">Client notes</p>
          <p className="mt-1 text-sm text-ink">{submission.description}</p>
        </div>
      )}

      <Card className="mt-6">
        <p className="font-mono text-[11px] uppercase tracking-wide text-grey">AI estimate</p>
        <p className="mt-1 font-display text-2xl text-ink">
          ${submission.estimatedPriceLow?.toFixed(0)}–${submission.estimatedPriceHigh?.toFixed(0)}
        </p>
        <p className="mt-1 text-sm text-grey">{submission.estimatedHours?.toFixed(1)} hours</p>
      </Card>

      {submission.status === "BOOKED" && submission.appointment ? (
        <DepositStatus
          appointmentId={submission.appointment.id}
          type={submission.appointment.type}
          startTime={submission.appointment.startTime.toISOString()}
          endTime={submission.appointment.endTime.toISOString()}
          depositPaid={submission.appointment.depositPaid}
          depositAmount={submission.appointment.depositAmount}
        />
      ) : (
        <ReviewActions
          submissionId={submission.id}
          currentStatus={submission.status}
          suggestedLow={submission.estimatedPriceLow ?? 0}
          suggestedHigh={submission.estimatedPriceHigh ?? 0}
          artistOverridePriceLow={submission.artistOverridePriceLow}
          artistOverridePriceHigh={submission.artistOverridePriceHigh}
          artistNotes={submission.artistNotes}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-wide text-grey">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
    </div>
  );
}
