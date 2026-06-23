import { API } from "../config/api";
import { getCookie } from "../utils/cookies";

const userId = getCookie("userId");
if (!userId) window.location.replace("/login");
if (getCookie("isAdmin") !== "true") window.location.replace("/start");

const isOwner = getCookie("isOwner") === "true";

type User = {
  id: string;
  username: string;
  email: string;
  verified: boolean;
  admin: boolean;
  owner: boolean;
  date_joined: string | null;
};

let allUsers: User[] = [];
let showUnverifiedOnly = false;

const searchInput = document.getElementById("user-search") as HTMLInputElement;
const usersList = document.getElementById("users-list") as HTMLElement;
const usersEmpty = document.getElementById("users-empty") as HTMLParagraphElement;
const filterBtn = document.getElementById("filter-unverified") as HTMLButtonElement;

filterBtn.addEventListener("click", () => {
  showUnverifiedOnly = !showUnverifiedOnly;
  filterBtn.classList.toggle("active", showUnverifiedOnly);
  applyFilter();
});

searchInput.addEventListener("input", applyFilter);

function applyFilter() {
  const query = searchInput.value.trim().toLowerCase();
  let filtered = allUsers;
  if (showUnverifiedOnly) filtered = filtered.filter((u) => !u.verified);
  if (query) filtered = filtered.filter((u) => u.username.toLowerCase().includes(query) || u.id.toLowerCase().includes(query));
  renderUsers(filtered);
}

async function loadUsers() {
  const res = await fetch(API.users.list, {
    headers: { Authorization: `Bearer ${userId}` },
  });
  if (!res.ok) {
    usersList.innerHTML = `<p class="feed-error">failed to load users.</p>`;
    return;
  }
  allUsers = await res.json();
  applyFilter();
}

function renderUsers(users: User[]) {
  usersList.innerHTML = "";
  usersEmpty.classList.toggle("hidden", users.length > 0);

  users.forEach((user) => {
    const card = document.createElement("div");
    card.className = "user-card";

    const info = document.createElement("div");
    info.className = "user-card-info";

    const top = document.createElement("div");
    top.className = "user-card-top";

    const name = document.createElement("span");
    name.className = "user-card-name";
    name.textContent = user.username;

    const badges = document.createElement("div");
    badges.className = "user-card-badges";
    if (user.verified) {
      const b = document.createElement("span");
      b.className = "admin-badge admin-badge--verified";
      b.textContent = "verified";
      badges.append(b);
    }
    if (user.admin) {
      const b = document.createElement("span");
      b.className = "admin-badge admin-badge--admin";
      b.textContent = "admin";
      badges.append(b);
    }
    if (user.owner) {
      const b = document.createElement("span");
      b.className = "admin-badge admin-badge--owner";
      b.textContent = "owner";
      badges.append(b);
    }

    top.append(name, badges);

    const email = document.createElement("span");
    email.className = "user-card-meta";
    email.textContent = user.email;

    const joined = document.createElement("span");
    joined.className = "user-card-meta";
    joined.textContent = user.date_joined
      ? new Date(user.date_joined).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
      : "";

    const id = document.createElement("span");
    id.className = "user-card-meta";
    id.textContent = user.id;

    info.append(top, email, joined, id);

    const actions = document.createElement("div");
    actions.className = "user-card-actions";

    if (!user.owner && !user.admin) {
      const verifyBtn = document.createElement("button");
      verifyBtn.className = user.verified ? "btn-secondary" : "btn-secondary btn--positive";
      verifyBtn.textContent = user.verified ? "unverify" : "verify";
      verifyBtn.addEventListener("click", () => toggleVerified(user.id));
      actions.append(verifyBtn);
    }

    if (isOwner && !user.owner && user.verified) {
      const adminBtn = document.createElement("button");
      adminBtn.className = "btn-secondary";
      adminBtn.textContent = user.admin ? "demote" : "promote";
      adminBtn.addEventListener("click", () => toggleAdmin(user.id));
      actions.append(adminBtn);
    }

    if (!user.owner && !user.admin) {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "btn-secondary btn--danger";
      deleteBtn.textContent = "delete";
      deleteBtn.addEventListener("click", () => deleteUser(user.id));
      actions.append(deleteBtn);
    }
    card.append(info, actions);
    usersList.appendChild(card);
  });
}

async function toggleVerified(user_id: string) {
  const res = await fetch(API.users.toggleVerified, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userId}` },
    body: JSON.stringify({ user_id }),
  });
  if (res.ok) loadUsers();
}

async function toggleAdmin(user_id: string) {
  const res = await fetch(API.users.toggleAdmin, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userId}` },
    body: JSON.stringify({ user_id }),
  });
  if (res.ok) loadUsers();
}

async function deleteUser(user_id: string) {
  if (!confirm("Delete this user? This cannot be undone.")) return;
  const res = await fetch(API.users.delete, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${userId}` },
    body: JSON.stringify({ user_id }),
  });
  if (res.ok) loadUsers();
}

loadUsers();
