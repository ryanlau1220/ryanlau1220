import { createFileRoute, Outlet, useParams } from "@tanstack/react-router";
import { DiaryExperience } from "../components/DiaryExperience";
import { loadDiary } from "../diary.functions";

/**
 * Pathless layout shared by "/" and "/$slug". The 3D book lives here so moving between the
 * cover and an entry only changes the URL and never remounts the scene.
 */
export const Route = createFileRoute("/_book")({
  loader: () => loadDiary(),
  // Moving between entries must not refetch; edits call router.invalidate() to refresh.
  staleTime: Number.POSITIVE_INFINITY,
  component: BookLayout,
});

function BookLayout() {
  const { entries, viewer } = Route.useLoaderData();
  const params = useParams({ strict: false }) as { slug?: string };
  return (
    <>
      <DiaryExperience
        entries={entries}
        isOwner={viewer.isOwner}
        activeSlug={params.slug ?? null}
      />
      <Outlet />
    </>
  );
}
