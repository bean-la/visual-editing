"use client";
import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { createClient } from "@sanity/client";
import { revalidateSyncTags } from "@sanity/next-loader/server-actions";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation.js";
import { useMemo, useEffect, useState, useRef } from "react";
import { useEffectEvent } from "use-effect-event";
import { setPerspective, setEnvironment } from "../_chunks-es/context.js";
import { isCorsOriginError } from "../_chunks-es/isCorsOriginError.js";
const PresentationComlink = dynamic(() => import("../_chunks-es/PresentationComlink.js"), { ssr: !1 }), RefreshOnMount = dynamic(() => import("../_chunks-es/RefreshOnMount.js"), { ssr: !1 }), RefreshOnFocus = dynamic(() => import("../_chunks-es/RefreshOnFocus.js"), { ssr: !1 }), RefreshOnReconnect = dynamic(() => import("../_chunks-es/RefreshOnReconnect.js"), { ssr: !1 }), isMaybePreviewIframe = () => window !== window.parent, isMaybePreviewWindow = () => !!window.opener, isMaybePresentation = () => isMaybePreviewIframe() || isMaybePreviewWindow(), handleError = (error) => {
  isCorsOriginError(error) ? console.warn(
    `Sanity Live is unable to connect to the Sanity API as the current origin - ${window.origin} - is not in the list of allowed CORS origins for this Sanity Project.`,
    error.addOriginUrl && "Add it here:",
    error.addOriginUrl?.toString()
  ) : console.error(error);
};
function SanityLive(props) {
  const {
    projectId,
    dataset,
    apiHost,
    apiVersion,
    useProjectHostname,
    token,
    requestTagPrefix,
    // handleDraftModeAction,
    draftModeEnabled,
    draftModePerspective,
    refreshOnMount = !1,
    refreshOnFocus = draftModeEnabled ? !1 : typeof window > "u" ? !0 : window.self === window.top,
    refreshOnReconnect = !0,
    tag,
    onError = handleError
  } = props, client = useMemo(
    () => createClient({
      projectId,
      dataset,
      apiHost,
      apiVersion,
      useProjectHostname,
      ignoreBrowserTokenWarning: !0,
      token,
      useCdn: !1,
      requestTagPrefix
    }),
    [apiHost, apiVersion, dataset, projectId, requestTagPrefix, token, useProjectHostname]
  ), router = useRouter(), handleLiveEvent = useEffectEvent(
    (event) => {
      process.env.NODE_ENV !== "production" && event.type === "welcome" ? console.info(
        "Sanity is live with",
        token ? "automatic revalidation for draft content changes as well as published content" : draftModeEnabled ? "automatic revalidation for only published content. Provide a `browserToken` to `defineLive` to support draft content outside of Presentation Tool." : "automatic revalidation of published content"
      ) : event.type === "message" ? revalidateSyncTags(event.tags) : event.type === "restart" && router.refresh();
    }
  );
  useEffect(() => {
    const subscription = client.live.events({ includeDrafts: !!token, tag }).subscribe({
      next: (event) => {
        (event.type === "message" || event.type === "restart" || event.type === "welcome") && handleLiveEvent(event);
      },
      error: (err) => {
        onError(err);
      }
    });
    return () => subscription.unsubscribe();
  }, [client.live, handleLiveEvent, onError, tag, token]), useEffect(() => {
    draftModeEnabled && draftModePerspective ? setPerspective(draftModePerspective) : setPerspective("unknown");
  }, [draftModeEnabled, draftModePerspective]);
  const [loadComlink, setLoadComlink] = useState(!1);
  useEffect(() => {
    if (!isMaybePresentation()) {
      if (draftModeEnabled && token) {
        setEnvironment("live");
        return;
      }
      if (draftModeEnabled) {
        setEnvironment("static");
        return;
      }
      setEnvironment("unknown");
    }
  }, [draftModeEnabled, token]), useEffect(() => {
    if (!isMaybePresentation()) return;
    const controller = new AbortController(), timeout = setTimeout(() => setEnvironment("live"), 3e3);
    return window.addEventListener(
      "message",
      ({ data }) => {
        data && typeof data == "object" && "domain" in data && data.domain === "sanity/channels" && "from" in data && data.from === "presentation" && (clearTimeout(timeout), setEnvironment(isMaybePreviewWindow() ? "presentation-window" : "presentation-iframe"), setLoadComlink(!0), controller.abort());
      },
      { signal: controller.signal }
    ), () => {
      clearTimeout(timeout), controller.abort();
    };
  }, []);
  const draftModeEnabledWarnRef = useRef(void 0);
  return useEffect(() => {
    if (draftModeEnabled)
      return clearTimeout(draftModeEnabledWarnRef.current), () => {
        draftModeEnabledWarnRef.current = setTimeout(() => {
          console.warn("Sanity Live: Draft mode was enabled, but is now being disabled");
        });
      };
  }, [draftModeEnabled]), /* @__PURE__ */ jsxs(Fragment, { children: [
    draftModeEnabled && loadComlink && /* @__PURE__ */ jsx(
      PresentationComlink,
      {
        draftModeEnabled,
        draftModePerspective
      }
    ),
    !draftModeEnabled && refreshOnMount && /* @__PURE__ */ jsx(RefreshOnMount, {}),
    !draftModeEnabled && refreshOnFocus && /* @__PURE__ */ jsx(RefreshOnFocus, {}),
    !draftModeEnabled && refreshOnReconnect && /* @__PURE__ */ jsx(RefreshOnReconnect, {})
  ] });
}
SanityLive.displayName = "SanityLive";
export {
  SanityLive as default
};
//# sourceMappingURL=live.js.map
