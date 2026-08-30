import type { AppBindings } from "@/types";
import {
  getAllUsersHandler,
  getAllUsersRoute,
} from "./handlers/get-all-users.handler";
import { createRouter } from "@sutra/shared";

export const userRoutes = createRouter<AppBindings>();

userRoutes.openapi(getAllUsersRoute, getAllUsersHandler);
