import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getHealthLiveApi = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/health/live`);
  return data.data;
};

export const getHealthStatusApi = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/health/status`, getAuthHeaders());

  return data.data;
};

export const getMetricsSummaryApi = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/metrics/summary`, getAuthHeaders());

  return data.data;
};

export const getEvalStatsApi = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/evals/stats`, getAuthHeaders());

  return data.data.stats;
};

export const getEvalReportsApi = async () => {
  const { data } = await axios.get(`${API_BASE_URL}/evals/reports`, getAuthHeaders());

  return data.data.reports;
};

export const getEvalReportByFileNameApi = async (fileName) => {
  const { data } = await axios.get(`${API_BASE_URL}/evals/reports/${fileName}`, getAuthHeaders());

  return data.data.report;
};

export const runEvalApi = async ({ videoId, guestUrl }) => {
  const { data } = await axios.post(
    `${API_BASE_URL}/evals/run`,
    {
      videoId,
      guestUrl,
    },
    getAuthHeaders()
  );

  return data.data;
};
