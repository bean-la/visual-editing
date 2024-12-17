import { createListenLogic, createRequestMachine, DOMAIN, MSG_HANDSHAKE_SYN, MSG_HANDSHAKE_SYN_ACK, MSG_HANDSHAKE_ACK, MSG_RESPONSE, MSG_HEARTBEAT, MSG_DISCONNECT, createNode, createNodeMachine } from "@sanity/comlink";
import { setPerspectiveCookie } from "@sanity/next-loader/server-actions";
import { useRouter } from "next/navigation.js";
import { useEffect } from "react";
import { useEffectEvent } from "use-effect-event";
import { setComlink } from "./context.js";
const channelsToComlinkMap = {
  "handshake/syn": MSG_HANDSHAKE_SYN,
  "handshake/syn-ack": MSG_HANDSHAKE_SYN_ACK,
  "handshake/ack": MSG_HANDSHAKE_ACK,
  "channel/response": MSG_RESPONSE,
  "channel/heartbeat": MSG_HEARTBEAT,
  "channel/disconnect": MSG_DISCONNECT,
  "overlay/focus": "visual-editing/focus",
  "overlay/navigate": "visual-editing/navigate",
  "overlay/toggle": "visual-editing/toggle",
  "presentation/toggleOverlay": "presentation/toggle-overlay"
}, comlinkToChannelsMap = {
  [MSG_HANDSHAKE_SYN]: "handshake/syn",
  [MSG_HANDSHAKE_SYN_ACK]: "handshake/syn-ack",
  [MSG_HANDSHAKE_ACK]: "handshake/ack",
  [MSG_RESPONSE]: "channel/response",
  [MSG_HEARTBEAT]: "channel/heartbeat",
  [MSG_DISCONNECT]: "channel/disconnect",
  "visual-editing/focus": "overlay/focus",
  "visual-editing/navigate": "overlay/navigate",
  "visual-editing/toggle": "overlay/toggle",
  "presentation/toggle-overlay": "presentation/toggleOverlay"
}, convertToComlinkEvent = (event) => {
  const { data } = event;
  return data && typeof data == "object" && "domain" in data && "type" in data && "from" in data && "to" in data && (data.domain === "sanity/channels" && (data.domain = DOMAIN), data.to === "overlays" && (data.to = "visual-editing"), data.from === "overlays" && (data.from = "visual-editing"), data.channelId = data.connectionId, delete data.connectionId, data.type = channelsToComlinkMap[data.type] ?? data.type), event;
}, convertToChannelsMessage = (comlinkMessage) => {
  const { channelId, ...rest } = comlinkMessage, message = { ...rest, connectionId: channelId };
  return message.domain === DOMAIN && (message.domain = "sanity/channels"), message.to === "visual-editing" && (message.to = "overlays"), message.from === "visual-editing" && (message.from = "overlays"), message.type = comlinkToChannelsMap[message.type] ?? message.type, message.type === "channel/response" && message.responseTo && !message.data && (message.data = { responseTo: message.responseTo }), (message.type === "handshake/syn" || message.type === "handshake/syn-ack" || message.type === "handshake/ack") && (message.data = { id: message.connectionId }), message;
}, sendAsChannelsMessage = ({ context }, params) => {
  const { sources, targetOrigin } = context, message = convertToChannelsMessage(params.message);
  sources.forEach((source) => {
    source.postMessage(message, { targetOrigin });
  });
}, createCompatibilityActors = () => ({
  listen: createListenLogic(convertToComlinkEvent),
  requestMachine: createRequestMachine().provide({
    actions: {
      "send message": sendAsChannelsMessage
    }
  })
});
function PresentationComlink(props) {
  const { draftModeEnabled, draftModePerspective } = props, router = useRouter(), handlePerspectiveChange = useEffectEvent(
    (perspective, signal) => {
      draftModeEnabled && perspective !== draftModePerspective && setPerspectiveCookie(perspective).then(() => {
        signal.aborted || router.refresh();
      }).catch((reason) => console.error("Failed to set the preview perspective cookie", reason));
    }
  );
  return useEffect(() => {
    const comlink = createNode(
      {
        name: "loaders",
        connectTo: "presentation"
      },
      createNodeMachine().provide({
        actors: createCompatibilityActors()
      })
    );
    let controller;
    comlink.on("loader/perspective", (data) => {
      controller?.abort(), controller = new AbortController(), handlePerspectiveChange(data.perspective, controller.signal);
    });
    const stop = comlink.start();
    return setComlink(comlink), () => {
      stop();
    };
  }, [handlePerspectiveChange]), null;
}
PresentationComlink.displayName = "PresentationComlink";
export {
  PresentationComlink as default
};
//# sourceMappingURL=PresentationComlink.js.map
