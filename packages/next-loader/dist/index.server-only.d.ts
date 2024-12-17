import {
  ClientPerspective,
  ClientReturn,
  ContentSourceMap,
  CorsOriginError,
  QueryParams,
  SanityClient,
} from '@sanity/client'

export {CorsOriginError}

/**
 * @public
 */
export declare type DefinedSanityFetchType = <const QueryString extends string>(options: {
  query: QueryString
  params?: QueryParams | Promise<QueryParams>
  perspective?: Exclude<ClientPerspective, 'raw'>
  stega?: boolean
  tag?: string
}) => Promise<{
  data: ClientReturn<QueryString>
  sourceMap: ContentSourceMap | null
  tags: string[]
}>

/**
 * @public
 */
export declare interface DefinedSanityLiveProps {
  projectId?: string
  /**
   * Automatic refresh of RSC when the component <SanityLive /> is mounted.
   * Note that this is different from revalidation, which is based on tags and causes `sanityFetch` calls to be re-fetched.
   * @defaultValue `true`
   */
  refreshOnMount?: boolean
  /**
   * Automatically refresh when window gets focused
   * Note that this is different from revalidation, which is based on tags and causes `sanityFetch` calls to be re-fetched.
   * @defaultValue `false` if draftMode().isEnabled, otherwise `true` if not inside an iframe
   */
  refreshOnFocus?: boolean
  /**
   * Automatically refresh when the browser regains a network connection (via navigator.onLine)
   * Note that this is different from revalidation, which is based on tags and causes `sanityFetch` calls to be re-fetched.
   * @defaultValue `true`
   */
  refreshOnReconnect?: boolean
  /**
   * Optional request tag for the listener. Use to identify the request in logs.
   *
   * @defaultValue `next-loader.live`
   */
  tag?: string
  /**
   * Handle errors from the Live Events subscription.
   * By default it's reported using `console.error`, you can override this prop to handle it in your own way.
   */
  onError?: (error: unknown) => void
}

/**
 * @public
 */
export declare type DefinedSanityLiveStreamType = <const QueryString extends string>(props: {
  query: QueryString
  params?: QueryParams | Promise<QueryParams>
  perspective?: Exclude<ClientPerspective, 'raw'>
  stega?: boolean
  tag?: string
  children: (result: {
    data: ClientReturn<QueryString>
    sourceMap: ContentSourceMap | null
    tags: string[]
  }) => Promise<Awaited<React.ReactNode>>
}) => React.ReactNode

/**
 * @public
 */
export declare function defineLive(config: DefineSanityLiveOptions): {
  sanityFetch: DefinedSanityFetchType
  SanityLive: React.ComponentType<DefinedSanityLiveProps>
  SanityLiveStream: DefinedSanityLiveStreamType
}

/**
 * @public
 */
export declare interface DefineSanityLiveOptions {
  /**
   * Required for `sanityFetch` and `SanityLive` to work
   */
  client: SanityClient
  /**
   * Optional. If provided then the token needs to have permissions to query documents with `drafts.` prefixes in order for `perspective: 'previewDrafts'` to work.
   * This token is not shared with the browser.
   */
  serverToken?: string
  /**
   * Optional. This token is shared with the browser, and should only have access to query published documents.
   * It is used to setup a `Live Draft Content` EventSource connection, and enables live previewing drafts stand-alone, outside of Presentation Tool.
   */
  browserToken?: string
  /**
   * Fetch options used by `sanityFetch`
   */
  fetchOptions?: {
    /**
     * Optional, enables time based revalidation in addition to the EventSource connection.
     * @defaultValue `false`
     */
    revalidate?: number | false
  }
  /**
   * Optional. Include stega encoding when draft mode is enabled.
   *  @defaultValue `true`
   */
  stega?: boolean
}

/** @public */
export declare function isCorsOriginError(error: unknown): error is CorsOriginError

export {}
