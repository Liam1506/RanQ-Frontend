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
  },
};
