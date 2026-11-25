export * from "./admin";
export * from "./auth";
export * from "./clinic";
export * from "./columns";
export * from "./enums";
export * from "./finance";
export * from "./growth";
export * from "./prescriptions";

import * as admin from "./admin";
import * as auth from "./auth";
import * as clinic from "./clinic";
import * as finance from "./finance";
import * as growth from "./growth";
import * as prescriptions from "./prescriptions";

export const schema = {
	...admin,
	...auth,
	...clinic,
	...finance,
	...growth,
	...prescriptions
};
