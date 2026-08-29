"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { createClient } from "@/lib/supabase/client";
import type { Activity, ActivityCompletion, ActivityOccurrenceOverride, Profile, ShoppingItem, Recorrencia, ActivityType, ActivityPeriod } from "@/lib/types/database";
import { PainelAtividades } from "@/components/app/PainelAtividades";

const ACCENT = "#12A87A";