import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/knowledge-base")({
  component: () => <Outlet />,
});
