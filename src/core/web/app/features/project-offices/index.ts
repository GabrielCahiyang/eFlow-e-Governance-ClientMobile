
export type {
  ProjectOffice,
  ProjectOfficeMember,
  ProjectOfficeState,
  OfficeIdentity,
} from "./types";

export {
  canStaffProjectOffice,
  canHandoverTask,
  projectOfficePeople,
} from "./selectors";

export {
  setResponsibleOffice,
  moveProjectOfficeTask,
} from "./services/projectOfficeService";

export {
  proposeTaskOffice,
  resolveTaskOffice,
} from "./services/officeIdentityService";