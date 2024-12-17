import { jsx } from "react/jsx-runtime";
import SanityLiveClientComponent from "@sanity/next-loader/client-components/live";
import SanityLiveStreamClientComponent from "@sanity/next-loader/client-components/live-stream";
import { perspectiveCookieName, sanitizePerspective } from "./_chunks-es/utils.js";
import { draftMode, cookies } from "next/headers.js";
import { isCorsOriginError } from "./_chunks-es/isCorsOriginError.js";
function defineLive(config) {
  const {
    client: _client,
    serverToken,
    browserToken,
    fetchOptions,
    stega: stegaEnabled = !0
  } = config;
  if (!_client)
    throw new Error("`client` is required for `defineLive` to function");
  process.env.NODE_ENV !== "production" && !serverToken && console.warn(
    "No `serverToken` provided to `defineLive`. This means that only published content will be fetched and respond to live events"
  ), process.env.NODE_ENV !== "production" && !browserToken && console.warn(
    "No `browserToken` provided to `defineLive`. This means that live previewing drafts will only work when using the Presentation Tool in your Sanity Studio. To support live previewing drafts stand-alone, provide a `browserToken`. It is shared with the browser so it should only have Viewer rights or lower"
  );
  const client = _client.withConfig({ allowReconfigure: !1, useCdn: !1 }), { token: originalToken } = client.config(), studioUrlDefined = typeof client.config().stega.studioUrl < "u", sanityFetch = async function({
    query,
    params = {},
    stega: _stega,
    perspective: _perspective,
    tag = "next-loader.fetch"
  }) {
    const stega = _stega ?? (stegaEnabled && studioUrlDefined && (await draftMode()).isEnabled), perspective = _perspective ?? ((await draftMode()).isEnabled ? (await cookies()).has(perspectiveCookieName) ? sanitizePerspective(
      (await cookies()).get(perspectiveCookieName)?.value,
      "previewDrafts"
    ) : "previewDrafts" : "published"), useCdn = perspective === "published", revalidate = fetchOptions?.revalidate ?? process.env.NODE_ENV === "production" ? !1 : void 0, { syncTags } = await client.fetch(query, await params, {
      filterResponse: !1,
      perspective,
      stega: !1,
      returnQuery: !1,
      next: { revalidate, tags: ["sanity:fetch-sync-tags"] },
      useCdn,
      cacheMode: useCdn ? "noStale" : void 0,
      tag: [tag, "fetch-sync-tags"].filter(Boolean).join(".")
    }), tags = ["sanity", ...syncTags?.map((tag2) => `sanity:${tag2}`) || []], { result, resultSourceMap } = await client.fetch(query, await params, {
      filterResponse: !1,
      perspective,
      stega,
      token: perspective !== "published" && serverToken ? serverToken : originalToken,
      next: { revalidate, tags },
      useCdn,
      cacheMode: useCdn ? "noStale" : void 0,
      tag
    });
    return { data: result, sourceMap: resultSourceMap || null, tags };
  };
  return {
    sanityFetch,
    SanityLive: async function(props) {
      const {
        // handleDraftModeAction = handleDraftModeActionMissing
        refreshOnMount,
        refreshOnFocus,
        refreshOnReconnect,
        tag = "next-loader.live",
        onError,
        projectId: _projectId
      } = props, {
        projectId,
        dataset,
        apiHost,
        apiVersion: _apiVersion,
        useProjectHostname,
        requestTagPrefix
      } = client.config(), { isEnabled: isDraftModeEnabled } = await draftMode();
      let apiVersion = _apiVersion;
      return typeof browserToken == "string" && isDraftModeEnabled && (apiVersion = "vX"), /* @__PURE__ */ jsx(
        SanityLiveClientComponent,
        {
          projectId: _projectId ?? projectId,
          dataset,
          apiHost,
          apiVersion,
          useProjectHostname,
          requestTagPrefix,
          tag,
          token: typeof browserToken == "string" && isDraftModeEnabled ? browserToken : void 0,
          draftModeEnabled: isDraftModeEnabled,
          draftModePerspective: isDraftModeEnabled ? (await cookies()).has(perspectiveCookieName) ? sanitizePerspective(
            (await cookies()).get(perspectiveCookieName)?.value,
            "previewDrafts"
          ) : "previewDrafts" : "published",
          refreshOnMount,
          refreshOnFocus,
          refreshOnReconnect,
          onError
        }
      );
    },
    SanityLiveStream: async function(props) {
      const {
        query,
        params,
        perspective: _perspective,
        stega: _stega,
        children,
        tag = "next-loader.live-stream.fetch"
      } = props, { data, sourceMap, tags } = await sanityFetch({
        query,
        params,
        perspective: _perspective,
        stega: _stega,
        tag
      }), { isEnabled: isDraftModeEnabled } = await draftMode();
      if (isDraftModeEnabled) {
        const stega = _stega ?? (stegaEnabled && studioUrlDefined && (await draftMode()).isEnabled), perspective = _perspective ?? (await cookies()).has(perspectiveCookieName) ? sanitizePerspective(
          (await cookies()).get(perspectiveCookieName)?.value,
          "previewDrafts"
        ) : "previewDrafts", { projectId, dataset } = client.config();
        return /* @__PURE__ */ jsx(
          SanityLiveStreamClientComponent,
          {
            projectId,
            dataset,
            query,
            params: await params,
            perspective,
            stega,
            initial: children({ data, sourceMap, tags }),
            children
          }
        );
      }
      return children({ data, sourceMap, tags });
    }
    // verifyPreviewSecret
  };
}
export {
  defineLive,
  isCorsOriginError
};
//# sourceMappingURL=index.js.map
