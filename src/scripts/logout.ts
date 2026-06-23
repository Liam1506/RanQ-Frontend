import { deleteCookie } from "../utils/cookies";

deleteCookie("userId");
deleteCookie("verified");
deleteCookie("isAdmin");
deleteCookie("isOwner");
window.location.replace("/login");
