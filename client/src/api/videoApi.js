import axiosClient from './axiosClient';

export const processVideoApi = async (url) =>
  (await axiosClient.post('/videos/process', { url })).data;
export const createChunksApi = async (videoId) =>
  (await axiosClient.post(`/videos/${videoId}/chunks`)).data;
export const indexVideoApi = async (videoId) =>
  (await axiosClient.post(`/videos/${videoId}/index`)).data;
export const getVideosApi = async () => (await axiosClient.get('/videos')).data;
export const getVideoApi = async (videoId) => (await axiosClient.get(`/videos/${videoId}`)).data;
export const getChatsApi = async (videoId) =>
  (await axiosClient.get(`/videos/${videoId}/chats`)).data;
export const askVideoApi = async (videoId, query, topK = 3) =>
  (await axiosClient.post(`/videos/${videoId}/ask`, { query, topK })).data;
