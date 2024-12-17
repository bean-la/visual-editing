"use client";
"use strict";
var jsxRuntime = require("react/jsx-runtime"), client = require("@sanity/client"), serverActions = require("@sanity/next-loader/server-actions"), dynamic = require("next/dynamic"), navigation_js = require("next/navigation.js"), React = require("react"), useEffectEvent = require("use-effect-event"), context = require("../_chunks-cjs/context.cjs"), isCorsOriginError = require("../_chunks-cjs/isCorsOriginError.cjs");
function _interopDefaultCompat(e) {
  return e && typeof e == "object" && "default" in e ? e : { default: e };
}
var dynamic__default = /* @__PURE__ */ _interopDefaultCompat(dynamic);
const PresentationComlink = dynamic__default.default(() => Promise.resolve().then(function() {
  return require("../_chunks-cjs/PresentationComlink.cjs");
}), { ssr: !1 }), RefreshOnMount = dynamic__default.default(() => Promise.resolve().then(function() {
  return require("../_chunks-cjs/RefreshOnMount.cjs");
}), { ssr: !1 }), RefreshOnFocus = dynamic__default.default(() => Promise.resolve().then(function() {
  return require("../_chunks-cjs/RefreshOnFocus.cjs");
}), { ssr: !1 }), RefreshOnReconnect = dynamic__default.default(() => Promise.resolve().then(function() {
  return require("../_chunks-cjs/RefreshOnReconnect.cjs");
}), { ssr: !1 }), isMaybePreviewIframe = () => window !== window.parent, isMaybePreviewWindow = () => !!window.opener, isMaybePresentation = () => isMaybePreviewIframe() || isMaybePreviewWindow(), handleError = (error) => {
  isCorsOriginError.isCorsOriginError(error) ? console.warn(
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
  } = props, client$1 = React.useMemo(
    () => client.createClient({
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
  ), router = navigation_js.useRouter(), handleLiveEvent = useEffectEvent.useEffectEvent(
    (event) => {
      process.env.NODE_ENV !== "production" && event.type === "welcome" ? console.info(
        "Sanity is live with",
        token ? "automatic revalidation for draft content changes as well as published content" : draftModeEnabled ? "automatic revalidation for only published content. Provide a `browserToken` to `defineLive` to support draft content outside of Presentation Tool." : "automatic revalidation of published content"
      ) : event.type === "message" ? serverActions.revalidateSyncTags(event.tags) : event.type === "restart" && router.refresh();
    }
  );
  React.useEffect(() => {
    const subscription = client$1.live.events({ includeDrafts: !!token, tag }).subscribe({
      next: (event) => {
        (event.type === "message" || event.type === "restart" || event.type === "welcome") && handleLiveEvent(event);
      },
      error: (err) => {
        onError(err);
      }
    });
    return () => subscription.unsubscribe();
  }, [client$1.live, handleLiveEvent, onError, tag, token]), React.useEffect(() => {
    draftModeEnabled && draftModePerspective ? context.setPerspective(draftModePerspective) : context.setPerspective("unknown");
  }, [draftModeEnabled, draftModePerspective]);
  const [loadComlink, setLoadComlink] = React.useState(!1);
  React.useEffect(() => {
    if (!isMaybePresentation()) {
      if (draftModeEnabled && token) {
        context.setEnvironment("live");
        return;
      }
      if (draftModeEnabled) {
        context.setEnvironment("static");
        return;
      }
      context.setEnvironment("unknown");
    }
  }, [draftModeEnabled, token]), React.useEffect(() => {
    if (!isMaybePresentation()) return;
    const controller = new AbortController(), timeout = setTimeout(() => context.setEnvironment("live"), 3e3);
    return window.addEventListener(
      "message",
      ({ data }) => {
        data && typeof data == "object" && "domain" in data && data.domain === "sanity/channels" && "from" in data && data.from === "presentation" && (clearTimeout(timeout), context.setEnvironment(isMaybePreviewWindow() ? "presentation-window" : "presentation-iframe"), setLoadComlink(!0), controller.abort());
      },
      { signal: controller.signal }
    ), () => {
      clearTimeout(timeout), controller.abort();
    };
  }, []);
  const draftModeEnabledWarnRef = React.useRef(void 0);
  return React.useEffect(() => {
    if (draftModeEnabled)
      return clearTimeout(draftModeEnabledWarnRef.current), () => {
        draftModeEnabledWarnRef.current = setTimeout(() => {
          console.warn("Sanity Live: Draft mode was enabled, but is now being disabled");
        });
      };
  }, [draftModeEnabled]), /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    draftModeEnabled && loadComlink && /* @__PURE__ */ jsxRuntime.jsx(
      PresentationComlink,
      {
        draftModeEnabled,
        draftModePerspective
      }
    ),
    !draftModeEnabled && refreshOnMount && /* @__PURE__ */ jsxRuntime.jsx(RefreshOnMount, {}),
    !draftModeEnabled && refreshOnFocus && /* @__PURE__ */ jsxRuntime.jsx(RefreshOnFocus, {}),
    !draftModeEnabled && refreshOnReconnect && /* @__PURE__ */ jsxRuntime.jsx(RefreshOnReconnect, {})
  ] });
}
SanityLive.displayName = "SanityLive";
module.exports = SanityLive;
//# sourceMappingURL=live.cjs.map
