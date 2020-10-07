import { Database } from "arangojs";

const up  = async (_ : Database) : Promise<Boolean> => true;
const down = async (_ : Database) : Promise<Boolean> => true;

export {
  up,
  down,
}
