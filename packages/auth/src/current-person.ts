import type { PersonId } from "@hypertask-docs/database";
import { Context } from "effect";

export class CurrentPerson extends Context.Service<CurrentPerson, PersonId>()(
  "@hypertask-docs/auth/CurrentPerson"
) {}
