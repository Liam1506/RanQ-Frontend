import { deleteCookie } from "../utils/cookies";

deleteCookie("userId");
deleteCookie("verified");
deleteCookie("isAdmin");
window.location.replace("/login");
