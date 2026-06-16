const BASE_URL = import.meta.env.PUBLIC_API_BASE_URL;

export const API = {
  auth: {
    login: `${BASE_URL}/api/auth/login`,
    register: `${BASE_URL}/api/auth/register`,
    logout: `${BASE_URL}/api/auth/logout`,
    verify: `${BASE_URL}/api/auth/verify`,
    status: `${BASE_URL}/api/auth/status`,
    devLogin: `${BASE_URL}/api/auth/dev-login`,
  },
  polls: {
    getAll: `${BASE_URL}/api/polls/getAll`,
    get: `${BASE_URL}/api/polls/get`,
    getUnapproved: `${BASE_URL}/api/polls/getUnapproved`,
    getMyPolls: `${BASE_URL}/api/polls/getMyPolls`,
    create: `${BASE_URL}/api/polls/create`,
    delete: `${BASE_URL}/api/polls/delete`,
    vote: `${BASE_URL}/api/polls/vote`,
    comment: `${BASE_URL}/api/polls/comment`,
    getAllComments: `${BASE_URL}/api/polls/getAllComments`,
    redditVote: `${BASE_URL}/api/polls/redditVote`,
    redditScore: `${BASE_URL}/api/polls/redditScore`,
    approvePoll: `${BASE_URL}/api/polls/approvePoll`,
    deleteVote: `${BASE_URL}/api/polls/deleteVote`,
    like: `${BASE_URL}/api/polls/like`,
    deleteComment: `${BASE_URL}/api/polls/delete_comment`,
  },
  siteSettings: {
    get: `${BASE_URL}/api/settings/`,
    update: `${BASE_URL}/api/settings/update/`,
    cleanup: `${BASE_URL}/api/settings/cleanup/`,
    stats: `${BASE_URL}/api/settings/stats/`,
  },
  users: {
    list: `${BASE_URL}/api/auth/users`,
    toggleAdmin: `${BASE_URL}/api/auth/users/toggle-admin`,
    toggleVerified: `${BASE_URL}/api/auth/users/toggle-verified`,
    delete: `${BASE_URL}/api/auth/users/delete`,
  },
};
