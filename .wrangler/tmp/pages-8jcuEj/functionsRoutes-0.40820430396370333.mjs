import { onRequestGet as __api_celebrations__view_id__js_onRequestGet } from "C:\\Users\\GrahamCameron(M365)\\Documents\\GitHub\\Celebrate\\functions\\api\\celebrations\\[view_id].js"
import { onRequestPatch as __api_celebrations__view_id__js_onRequestPatch } from "C:\\Users\\GrahamCameron(M365)\\Documents\\GitHub\\Celebrate\\functions\\api\\celebrations\\[view_id].js"
import { onRequestPost as __api_celebrations_index_js_onRequestPost } from "C:\\Users\\GrahamCameron(M365)\\Documents\\GitHub\\Celebrate\\functions\\api\\celebrations\\index.js"

export const routes = [
    {
      routePath: "/api/celebrations/:view_id",
      mountPath: "/api/celebrations",
      method: "GET",
      middlewares: [],
      modules: [__api_celebrations__view_id__js_onRequestGet],
    },
  {
      routePath: "/api/celebrations/:view_id",
      mountPath: "/api/celebrations",
      method: "PATCH",
      middlewares: [],
      modules: [__api_celebrations__view_id__js_onRequestPatch],
    },
  {
      routePath: "/api/celebrations",
      mountPath: "/api/celebrations",
      method: "POST",
      middlewares: [],
      modules: [__api_celebrations_index_js_onRequestPost],
    },
  ]