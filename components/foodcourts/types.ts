import type { CourtDetail } from "@/lib/foodCourts";

export type TabProps = { detail: CourtDetail; reload: () => Promise<void>; canManage: boolean };
