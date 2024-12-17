import { v4 } from "uuid";
import { fromEventObservable, setup, sendTo, assign, fromCallback, enqueueActions, assertEvent, emit, raise, stopChild, createActor } from "xstate";
import { defer, fromEvent, map, pipe, filter, bufferCount, concatMap, take, EMPTY, takeUntil } from "rxjs";
const listenInputFromContext = (config) => ({
  context
}) => {
  const { count, include, exclude, responseType = "message.received" } = config;
  return {
    count,
    domain: context.domain,
    from: context.connectTo,
    include: include ? Array.isArray(include) ? include : [include] : [],
    exclude: exclude ? Array.isArray(exclude) ? exclude : [exclude] : [],
    responseType,
    target: context.target,
    to: context.name
  };
}, listenFilter = (input) => (event) => {
  const { data } = event;
  return (input.include.length ? input.include.includes(data.type) : !0) && (input.exclude.length ? !input.exclude.includes(data.type) : !0) && data.domain === input.domain && data.from === input.from && data.to === input.to && (!input.target || event.source === input.target);
}, eventToMessage = (type) => (event) => ({
  type,
  message: event
}), messageEvents$ = defer(
  () => fromEvent(window, "message")
), createListenLogic = (compatMap) => fromEventObservable(({ input }) => messageEvents$.pipe(
  compatMap ? map(compatMap) : pipe(),
  filter(listenFilter(input)),
  map(eventToMessage(input.responseType)),
  input.count ? pipe(
    bufferCount(input.count),
    concatMap((arr) => arr),
    take(input.count)
  ) : pipe()
)), DOMAIN = "sanity/comlink", RESPONSE_TIMEOUT_DEFAULT = 3e3, FETCH_TIMEOUT_DEFAULT = 1e4, HEARTBEAT_INTERVAL = 1e3, HANDSHAKE_INTERVAL = 500, MSG_RESPONSE = "comlink/response", MSG_HEARTBEAT = "comlink/heartbeat", MSG_DISCONNECT = "comlink/disconnect", MSG_HANDSHAKE_SYN = "comlink/handshake/syn", MSG_HANDSHAKE_SYN_ACK = "comlink/handshake/syn-ack", MSG_HANDSHAKE_ACK = "comlink/handshake/ack", HANDSHAKE_MSG_TYPES = [
  MSG_HANDSHAKE_SYN,
  MSG_HANDSHAKE_SYN_ACK,
  MSG_HANDSHAKE_ACK
], INTERNAL_MSG_TYPES = [
  MSG_RESPONSE,
  MSG_DISCONNECT,
  MSG_HEARTBEAT,
  ...HANDSHAKE_MSG_TYPES
], throwOnEvent = (message) => (source) => source.pipe(
  take(1),
  map(() => {
    throw new Error(message);
  })
), createRequestMachine = () => setup({
  types: {},
  actors: {
    listen: fromEventObservable(
      ({
        input
      }) => {
        const abortSignal$ = input.signal ? fromEvent(input.signal, "abort").pipe(
          throwOnEvent(`Request ${input.requestId} aborted`)
        ) : EMPTY, messageFilter = (event) => event.data?.type === MSG_RESPONSE && event.data?.responseTo === input.requestId && !!event.source && input.sources.has(event.source);
        return fromEvent(window, "message").pipe(
          filter(messageFilter),
          take(input.sources.size),
          takeUntil(abortSignal$)
        );
      }
    )
  },
  actions: {
    "send message": ({ context }, params) => {
      const { sources, targetOrigin } = context, { message } = params;
      sources.forEach((source) => {
        source.postMessage(message, { targetOrigin });
      });
    },
    "on success": sendTo(
      ({ context }) => context.parentRef,
      ({ context, self }) => (context.response && context.resolvable?.resolve(context.response), {
        type: "request.success",
        requestId: self.id,
        response: context.response,
        responseTo: context.responseTo
      })
    ),
    "on fail": sendTo(
      ({ context }) => context.parentRef,
      ({ context, self }) => (context.suppressWarnings || console.warn(
        `[@sanity/comlink] Received no response to message '${context.type}' on client '${context.from}' (ID: '${context.id}').`
      ), context.resolvable?.reject(new Error("No response received")), { type: "request.failed", requestId: self.id })
    ),
    "on abort": sendTo(
      ({ context }) => context.parentRef,
      ({ context, self }) => (context.resolvable?.reject(new Error("Request aborted")), { type: "request.aborted", requestId: self.id })
    )
  },
  guards: {
    expectsResponse: ({ context }) => context.expectResponse
  },
  delays: {
    initialTimeout: 0,
    responseTimeout: ({ context }) => context.responseTimeout ?? RESPONSE_TIMEOUT_DEFAULT
  }
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAoC2BDAxgCwJYDswBKAOlwgBswBiAD1gBd0GwT0AzFgJ2QNwdzoKAFVyowAewCuDItTRY8hUuSoBtAAwBdRKAAOE2P1wT8ukLUQBGAEwBWEgBYAnK+eOAzB7sB2DzY8rABoQAE9rDQc3V0cNTw8fAA4NHwBfVJCFHAJiElgwfAgCKGpNHSQQAyMBU3NLBDsrDxI7DTaAjQA2OOcNDxDwhHsNJx9Ou0TOq2cJxP9HdMyMbOU8gqL8ErUrcv1DY1qK+sbm1vaPLp6+gcRnGydo9wDGycWQLKVc9AB3dGNN6jiWCwdAwMrmKoHMxHRCJRKOEiJHwuZKBZwXKzBMKIGyYkhtAkXOweTqOHw2RJvD45Ug-P4CAH0JgsNicMA8LhwAz4fKicTSWTyZafWm-f5QcEVSE1aGgepwhFIlF9aYYrGDC4+JzEppjGzOUkeGbpDIgfASCBwczU5QQ-YyuqIAC0nRuCBd+IJXu9KSpwppZEoYDt1RMsosiEcNjdVjiJEeGisiSTHkcVgWpptuXyhWKIahjqGzi1BqRJINnVcdkcbuTLS9VYC8ISfsUAbp4vzDphCHJIyjBvJNlxNmRNexQ3sJGH43GPj8jWJrZWuXYfyoEC7YcLsbrgRsjkcvkmdgNbopVhIPhVfnsh8ClMz-tWsCkmEwcHgUvt257u8v+6Hse4xnhOdZnImVidPqCRNB4JqpEAA */
  context: ({ input }) => ({
    channelId: input.channelId,
    data: input.data,
    domain: input.domain,
    expectResponse: input.expectResponse ?? !1,
    from: input.from,
    id: `msg-${v4()}`,
    parentRef: input.parentRef,
    resolvable: input.resolvable,
    response: null,
    responseTimeout: input.responseTimeout,
    responseTo: input.responseTo,
    signal: input.signal,
    sources: input.sources instanceof Set ? input.sources : /* @__PURE__ */ new Set([input.sources]),
    suppressWarnings: input.suppressWarnings,
    targetOrigin: input.targetOrigin,
    to: input.to,
    type: input.type
  }),
  initial: "idle",
  on: {
    abort: ".aborted"
  },
  states: {
    idle: {
      after: {
        initialTimeout: [
          {
            target: "sending"
          }
        ]
      }
    },
    sending: {
      entry: {
        type: "send message",
        params: ({ context }) => {
          const { channelId, data, domain, from, id, responseTo, to, type } = context;
          return { message: {
            channelId,
            data,
            domain,
            from,
            id,
            to,
            type,
            responseTo
          } };
        }
      },
      always: [
        {
          guard: "expectsResponse",
          target: "awaiting"
        },
        "success"
      ]
    },
    awaiting: {
      invoke: {
        id: "listen for response",
        src: "listen",
        input: ({ context }) => ({
          requestId: context.id,
          sources: context.sources,
          signal: context.signal
        }),
        onError: "aborted"
      },
      after: {
        responseTimeout: "failed"
      },
      on: {
        message: {
          actions: assign({
            response: ({ event }) => event.data.data,
            responseTo: ({ event }) => event.data.responseTo
          }),
          target: "success"
        }
      }
    },
    failed: {
      type: "final",
      entry: "on fail"
    },
    success: {
      type: "final",
      entry: "on success"
    },
    aborted: {
      type: "final",
      entry: "on abort"
    }
  },
  output: ({ context, self }) => ({
    requestId: self.id,
    response: context.response,
    responseTo: context.responseTo
  })
}), sendBackAtInterval = fromCallback(({ sendBack, input }) => {
  const send = () => {
    sendBack(input.event);
  };
  input.immediate && send();
  const interval = setInterval(send, input.interval);
  return () => {
    clearInterval(interval);
  };
}), createConnectionMachine = () => setup({
  types: {},
  actors: {
    requestMachine: createRequestMachine(),
    listen: createListenLogic(),
    sendBackAtInterval
  },
  actions: {
    "buffer message": enqueueActions(({ enqueue }) => {
      enqueue.assign({
        buffer: ({ event, context }) => (assertEvent(event, "post"), [...context.buffer, event.data])
      }), enqueue.emit(({ event }) => (assertEvent(event, "post"), {
        type: "_buffer.added",
        message: event.data
      }));
    }),
    "create request": assign({
      requests: ({ context, event, self, spawn }) => {
        assertEvent(event, "request");
        const requests = (Array.isArray(event.data) ? event.data : [event.data]).map((request) => {
          const id = `req-${v4()}`;
          return spawn("requestMachine", {
            id,
            input: {
              channelId: context.channelId,
              data: request.data,
              domain: context.domain,
              expectResponse: request.expectResponse,
              from: context.name,
              parentRef: self,
              responseTo: request.responseTo,
              sources: context.target,
              targetOrigin: context.targetOrigin,
              to: context.connectTo,
              type: request.type
            }
          });
        });
        return [...context.requests, ...requests];
      }
    }),
    "emit received message": enqueueActions(({ enqueue }) => {
      enqueue.emit(({ event }) => (assertEvent(event, "message.received"), {
        type: "_message",
        message: event.message.data
      })), enqueue.emit(({ event }) => (assertEvent(event, "message.received"), {
        type: event.message.data.type,
        message: event.message.data
      }));
    }),
    "emit status": emit((_, params) => ({
      type: "_status",
      status: params.status
    })),
    "flush buffer": enqueueActions(({ enqueue }) => {
      enqueue.raise(({ context }) => ({
        type: "request",
        data: context.buffer.map(({ data, type }) => ({ data, type }))
      })), enqueue.emit(({ context }) => ({
        type: "_buffer.flushed",
        messages: context.buffer
      })), enqueue.assign({
        buffer: []
      });
    }),
    post: raise(({ event }) => (assertEvent(event, "post"), {
      type: "request",
      data: {
        data: event.data.data,
        expectResponse: !0,
        type: event.data.type
      }
    })),
    "remove request": enqueueActions(({ context, enqueue, event }) => {
      assertEvent(event, ["request.success", "request.failed", "request.aborted"]), stopChild(event.requestId), enqueue.assign({ requests: context.requests.filter(({ id }) => id !== event.requestId) });
    }),
    respond: raise(({ event }) => (assertEvent(event, "response"), {
      type: "request",
      data: {
        data: event.data,
        type: MSG_RESPONSE,
        responseTo: event.respondTo
      }
    })),
    "send handshake ack": raise({
      type: "request",
      data: { type: MSG_HANDSHAKE_ACK }
    }),
    "send disconnect": raise(() => ({
      type: "request",
      data: { type: MSG_DISCONNECT }
    })),
    "send handshake syn": raise({
      type: "request",
      data: { type: MSG_HANDSHAKE_SYN }
    }),
    "set target": assign({
      target: ({ event }) => (assertEvent(event, "target.set"), event.target)
    })
  },
  guards: {
    "has target": ({ context }) => !!context.target,
    "should send heartbeats": ({ context }) => context.heartbeat
  }
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QGMAWBDAdpsAbAxAC7oBOMhAdLGIQNoAMAuoqAA4D2sAloV+5ixAAPRAHZRAJgoAWABz0ArHICMy2QGZZCgJwAaEAE9EE+tIrb6ANgkLl46fTuj1AXxf60WHARJgAjgCucJSwAcjIcLAMzEggHNy8-IIiCKLS2hQS6qb2yurisrL6RgjK9LIyCuqq0g7WstZuHhjYePi+gcEUAGboXLiQ0YLxPHwCsSmiCgoykpayDtqS6trqxYjKEk0gnq24FFwQA-jI-DjIdEzDnKNJExuOZpZ12eq29OrSCuupypYUojUaTKCnm5Wk2123gORzA+HilxibBuiXGoBSGnUAIU4gU9FWamUtR+lmUM1EllBEkslMUEnpkJa0JaEFgGAA1lxMFB8LADJghrERqjkhtshk3mTtNo5OpqpYfqCKhTptoqpY1WUtu4dky8BQWWz0Jzue1-EFYIjrgkxqLSupqRRPpoPqJtLI0hIioZENJJE7NnJ8ZYHVk1YyvPrDRyuTyEYLkTa7uixVlMh81KGFhS1j6EPkZlpVjTphr8mkI3sDVhWTHTQBbSLoGAUXwRLgAN0GVyFKNt91KimUFEKXvKC2s9R+6X+jipnzJeSqEJ1UKjNaNJp5EC4sFOrQuCbifeTwg2cgoym0RPxDtqkj0eaB9Ao8zSolMEivZVcq71+33c5CEgeFOCtXskzRM8EDxKRpmkSw3QJbQsmpH5tHmV8JHSbJpDsakV2aSMALOMALhAjoLXAxNbiglI-SxWw1Vw0QNDw0Qfg9KQ7EJSxHHxApK2hQCyOAiAzVgDhMGoI9hX7FMEHSF8cWkelpHURCbBsb481xAEgT9BQJCmWQsiE-URPI8TG1gWBmzAVsyLATtuyRY9ILtWoKmlL82Kqd0tAVJ91LMHFZDKIkVlkNVZHMkiDzE-Adz3UjDx7GiRQHCKnheD53k+HSSkDDIwpBVTqQwuKKEssSDTAUhCAAI3qyg0DIrd8Fkk86MQUMnVM+RynoegTDJH48hGp0vR-FDRqqKqasgOqGua9AQjATAd1NSiul6fpXOtWi7Wy19cslD4vnG7IX3oVjVDUVYEJQqrksW8SdstLqPKy0wKgG1RhtMWogqKhoMjkWp6XxUyFBe3c3tAz70vco6fq+V8PTkGUFzdQqNnELEM2yClrwwzQ4ZShKQJqr7UYU98AS0W9pT4z5pHG0yXwMkNNTyGk3B1TB2AgOBBDXXBDsyhSFG9EovQqN5i1JeRcKqw4Bkl+ToMx8x0j+EaqQ9XMSkBURMgMkEwQWKro2NWNNdPFJAzN0lJGM4slDxhBEJfXyplBd03wW1KxIdnrBxBh4JAyW75C8rJpmDqmIGWkgmpasPjqUcaHooMLHA0uU1UkJOgKW1B6rT1bWor5At0zgcTAkK7hrz1irB0D8cW0UvRPLyv07WqgNq2qAG+l9SnXUz0UOXD5xuMs3Y4+DVJBX7UiKrV6Q8gcfoJO54rFefLLqfJYX1WKYNLxL4NO1NwgA */
  id: "connection",
  context: ({ input }) => ({
    id: input.id || `${input.name}-${v4()}`,
    buffer: [],
    channelId: `chn-${v4()}`,
    connectTo: input.connectTo,
    domain: input.domain ?? DOMAIN,
    heartbeat: input.heartbeat ?? !1,
    name: input.name,
    requests: [],
    target: input.target,
    targetOrigin: input.targetOrigin
  }),
  on: {
    "target.set": {
      actions: "set target"
    },
    "request.success": {
      actions: "remove request"
    },
    "request.failed": {
      actions: "remove request"
    }
  },
  initial: "idle",
  states: {
    idle: {
      entry: [{ type: "emit status", params: { status: "idle" } }],
      on: {
        connect: {
          target: "handshaking",
          guard: "has target"
        },
        post: {
          actions: "buffer message"
        }
      }
    },
    handshaking: {
      id: "handshaking",
      entry: [{ type: "emit status", params: { status: "handshaking" } }],
      invoke: [
        {
          id: "send syn",
          src: "sendBackAtInterval",
          input: () => ({
            event: { type: "syn" },
            interval: HANDSHAKE_INTERVAL,
            immediate: !0
          })
        },
        {
          id: "listen for handshake",
          src: "listen",
          input: (input) => listenInputFromContext({
            include: MSG_HANDSHAKE_SYN_ACK,
            count: 1
          })(input)
          /* Below would maybe be more readable than transitioning to
          'connected' on 'message', and 'ack' on exit but having onDone when
          using passing invocations currently breaks XState Editor */
          // onDone: {
          //   target: 'connected',
          //   actions: 'ack',
          // },
        }
      ],
      on: {
        syn: {
          actions: "send handshake syn"
        },
        request: {
          actions: "create request"
        },
        post: {
          actions: "buffer message"
        },
        "message.received": {
          target: "connected"
        },
        disconnect: {
          target: "disconnected"
        }
      },
      exit: "send handshake ack"
    },
    connected: {
      entry: ["flush buffer", { type: "emit status", params: { status: "connected" } }],
      invoke: {
        id: "listen for messages",
        src: "listen",
        input: listenInputFromContext({
          exclude: [MSG_RESPONSE, MSG_HEARTBEAT]
        })
      },
      on: {
        post: {
          actions: "post"
        },
        request: {
          actions: "create request"
        },
        response: {
          actions: "respond"
        },
        "message.received": {
          actions: "emit received message"
        },
        disconnect: {
          target: "disconnected"
        }
      },
      initial: "heartbeat",
      states: {
        heartbeat: {
          initial: "checking",
          states: {
            checking: {
              always: {
                guard: "should send heartbeats",
                target: "sending"
              }
            },
            sending: {
              on: {
                "request.failed": {
                  target: "#handshaking"
                }
              },
              invoke: {
                id: "send heartbeat",
                src: "sendBackAtInterval",
                input: () => ({
                  event: { type: "post", data: { type: MSG_HEARTBEAT, data: void 0 } },
                  interval: 2e3,
                  immediate: !1
                })
              }
            }
          }
        }
      }
    },
    disconnected: {
      id: "disconnected",
      entry: ["send disconnect", { type: "emit status", params: { status: "disconnected" } }],
      on: {
        request: {
          actions: "create request"
        },
        post: {
          actions: "buffer message"
        },
        connect: {
          target: "handshaking",
          guard: "has target"
        }
      }
    }
  }
}), createConnection = (input, machine = createConnectionMachine()) => {
  const id = input.id || `${input.name}-${v4()}`, actor = createActor(machine, {
    input: { ...input, id }
  }), on = (type, handler) => {
    const { unsubscribe } = actor.on(
      // @ts-expect-error @todo `type` typing
      type,
      async (event) => {
        const response = await handler(event.message.data);
        response && actor.send({ type: "response", respondTo: event.message.id, data: response });
      }
    );
    return unsubscribe;
  }, connect = () => {
    actor.send({ type: "connect" });
  }, disconnect = () => {
    actor.send({ type: "disconnect" });
  }, onStatus = (handler, filter2) => {
    const { unsubscribe } = actor.on(
      // @ts-expect-error @todo ReceivedEmitEvent causes this
      "_status",
      (event) => {
        filter2 && event.status !== filter2 || handler(event.status);
      }
    );
    return unsubscribe;
  }, setTarget = (target) => {
    actor.send({ type: "target.set", target });
  }, post = (type, data) => {
    const _data = { type, data };
    actor.send({ type: "post", data: _data });
  }, stop = () => {
    actor.stop();
  }, start = () => (actor.start(), stop);
  return {
    actor,
    connect,
    disconnect,
    id,
    name: input.name,
    machine,
    on,
    onStatus,
    post,
    setTarget,
    start,
    stop,
    get target() {
      return actor.getSnapshot().context.target;
    }
  };
}, cleanupConnection = (connection) => {
  connection.disconnect(), setTimeout(() => {
    connection.stop();
  }, 0);
}, noop = () => {
}, createController = (input) => {
  const { targetOrigin } = input, targets = /* @__PURE__ */ new Set(), channels = /* @__PURE__ */ new Set();
  return {
    addTarget: (target) => {
      if (targets.has(target))
        return noop;
      if (!targets.size || !channels.size)
        return targets.add(target), channels.forEach((channel) => {
          channel.connections.forEach((connection) => {
            connection.setTarget(target), connection.connect();
          });
        }), () => {
          targets.delete(target), channels.forEach((channel) => {
            channel.connections.forEach((connection) => {
              connection.target === target && connection.disconnect();
            });
          });
        };
      targets.add(target);
      const targetConnections = /* @__PURE__ */ new Set();
      return channels.forEach((channel) => {
        const connection = createConnection(
          {
            ...channel.input,
            target,
            targetOrigin
          },
          channel.machine
        );
        targetConnections.add(connection), channel.connections.add(connection), channel.subscribers.forEach(({ type, handler, unsubscribers }) => {
          unsubscribers.push(connection.on(type, handler));
        }), channel.internalEventSubscribers.forEach(({ type, handler, unsubscribers }) => {
          unsubscribers.push(connection.actor.on(type, handler).unsubscribe);
        }), channel.statusSubscribers.forEach(({ handler, unsubscribers }) => {
          unsubscribers.push(
            connection.onStatus((status) => handler({ connection: connection.id, status }))
          );
        }), connection.start(), connection.connect();
      }), () => {
        targets.delete(target), targetConnections.forEach((connection) => {
          cleanupConnection(connection), channels.forEach((channel) => {
            channel.connections.delete(connection);
          });
        });
      };
    },
    createChannel: (input2, machine = createConnectionMachine()) => {
      const channel = {
        connections: /* @__PURE__ */ new Set(),
        input: input2,
        internalEventSubscribers: /* @__PURE__ */ new Set(),
        machine,
        statusSubscribers: /* @__PURE__ */ new Set(),
        subscribers: /* @__PURE__ */ new Set()
      };
      channels.add(channel);
      const { connections, internalEventSubscribers, statusSubscribers, subscribers } = channel;
      if (targets.size)
        targets.forEach((target) => {
          const connection = createConnection(
            {
              ...input2,
              target,
              targetOrigin
            },
            machine
          );
          connections.add(connection);
        });
      else {
        const connection = createConnection({ ...input2, targetOrigin }, machine);
        connections.add(connection);
      }
      const post = (...params) => {
        const [type, data] = params;
        connections.forEach((connection) => {
          connection.post(type, data);
        });
      }, on = (type, handler) => {
        const unsubscribers = [];
        connections.forEach((connection) => {
          unsubscribers.push(connection.on(type, handler));
        });
        const subscriber = { type, handler, unsubscribers };
        return subscribers.add(subscriber), () => {
          unsubscribers.forEach((unsub) => unsub()), subscribers.delete(subscriber);
        };
      }, onInternalEvent = (type, handler) => {
        const unsubscribers = [];
        connections.forEach((connection) => {
          unsubscribers.push(connection.actor.on(type, handler).unsubscribe);
        });
        const subscriber = { type, handler, unsubscribers };
        return internalEventSubscribers.add(subscriber), () => {
          unsubscribers.forEach((unsub) => unsub()), internalEventSubscribers.delete(subscriber);
        };
      }, onStatus = (handler) => {
        const unsubscribers = [];
        connections.forEach((connection) => {
          unsubscribers.push(
            connection.onStatus((status) => handler({ connection: connection.id, status }))
          );
        });
        const subscriber = { handler, unsubscribers };
        return statusSubscribers.add(subscriber), () => {
          unsubscribers.forEach((unsub) => unsub()), statusSubscribers.delete(subscriber);
        };
      }, stop = () => {
        const connections2 = channel.connections;
        connections2.forEach(cleanupConnection), connections2.clear(), channels.delete(channel);
      };
      return {
        on,
        onInternalEvent,
        onStatus,
        post,
        start: () => (connections.forEach((connection) => {
          connection.start(), connection.connect();
        }), stop),
        stop
      };
    },
    destroy: () => {
      channels.forEach(({ connections }) => {
        connections.forEach(cleanupConnection), connections.clear();
      }), channels.clear(), targets.clear();
    }
  };
}, createNodeMachine = () => setup({
  types: {},
  actors: {
    requestMachine: createRequestMachine(),
    listen: createListenLogic()
  },
  actions: {
    "buffer incoming message": assign({
      handshakeBuffer: ({ event, context }) => (assertEvent(event, "message.received"), [...context.handshakeBuffer, event])
    }),
    "buffer message": enqueueActions(({ enqueue }) => {
      enqueue.assign({
        buffer: ({ event, context }) => (assertEvent(event, "post"), [
          ...context.buffer,
          {
            data: event.data,
            resolvable: event.resolvable,
            options: event.options
          }
        ])
      }), enqueue.emit(({ event }) => (assertEvent(event, "post"), {
        type: "_buffer.added",
        message: event.data
      }));
    }),
    "create request": assign({
      requests: ({ context, event, self, spawn }) => {
        assertEvent(event, "request");
        const requests = (Array.isArray(event.data) ? event.data : [event.data]).map((request) => {
          const id = `req-${v4()}`;
          return spawn("requestMachine", {
            id,
            input: {
              channelId: context.channelId,
              data: request.data,
              domain: context.domain,
              expectResponse: request.expectResponse,
              from: context.name,
              parentRef: self,
              resolvable: request.resolvable,
              responseTimeout: request.options?.responseTimeout,
              responseTo: request.responseTo,
              signal: request.options?.signal,
              sources: context.target,
              suppressWarnings: request.options?.suppressWarnings,
              targetOrigin: context.targetOrigin,
              to: context.connectTo,
              type: request.type
            }
          });
        });
        return [...context.requests, ...requests];
      }
    }),
    "emit heartbeat": emit(() => ({
      type: "_heartbeat"
    })),
    "emit received message": enqueueActions(({ enqueue }) => {
      enqueue.emit(({ event }) => (assertEvent(event, "message.received"), {
        type: "_message",
        message: event.message.data
      })), enqueue.emit(({ event }) => (assertEvent(event, "message.received"), {
        type: event.message.data.type,
        message: event.message.data
      }));
    }),
    "emit status": emit((_, params) => ({
      type: "_status",
      status: params.status
    })),
    "flush buffer": enqueueActions(({ enqueue }) => {
      enqueue.raise(({ context }) => ({
        type: "request",
        data: context.buffer.map(({ data, resolvable, options }) => ({
          data: data.data,
          type: data.type,
          expectResponse: !!resolvable,
          resolvable,
          options
        }))
      })), enqueue.emit(({ context }) => ({
        type: "_buffer.flushed",
        messages: context.buffer.map(({ data }) => data)
      })), enqueue.assign({
        buffer: []
      });
    }),
    "flush handshake buffer": enqueueActions(({ context, enqueue }) => {
      context.handshakeBuffer.forEach((event) => enqueue.raise(event)), enqueue.assign({
        handshakeBuffer: []
      });
    }),
    post: raise(({ event }) => (assertEvent(event, "post"), {
      type: "request",
      data: {
        data: event.data.data,
        expectResponse: !!event.resolvable,
        type: event.data.type,
        resolvable: event.resolvable,
        options: event.options
      }
    })),
    "remove request": enqueueActions(({ context, enqueue, event }) => {
      assertEvent(event, ["request.success", "request.failed", "request.aborted"]), stopChild(event.requestId), enqueue.assign({ requests: context.requests.filter(({ id }) => id !== event.requestId) });
    }),
    "send response": raise(({ event }) => (assertEvent(event, ["message.received", "heartbeat.received"]), {
      type: "request",
      data: {
        type: MSG_RESPONSE,
        responseTo: event.message.data.id,
        data: void 0
      }
    })),
    "send handshake syn ack": raise({
      type: "request",
      data: { type: MSG_HANDSHAKE_SYN_ACK }
    }),
    "set connection config": assign({
      channelId: ({ event }) => (assertEvent(event, "handshake.syn"), event.message.data.channelId),
      target: ({ event }) => (assertEvent(event, "handshake.syn"), event.message.source || void 0),
      targetOrigin: ({ event }) => (assertEvent(event, "handshake.syn"), event.message.origin)
    })
  },
  guards: {
    hasSource: ({ context }) => context.target !== null
  }
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QDsD2EwGIBOYCOArnAC4B0sBAxpXLANoAMAuoqAA6qwCWxXqyrEAA9EAVgYAWUgEYJDUQA4JAZmUSJC0coDsAGhABPRNIYLSErdOkBOAGzbx227YUBfV-rQYc+IrDIAZgCGXAA2kIwsSCAc3Lz8giIIoiakqgBMDKbp2tYS0srp+kYI0ununuhgpFwQ4ZgQ-NVcyABuqADW1V7NdWAILe2UQfHIkZGCsTx8AtFJ6aKipAzWOtrpC7Z5BUWGiNoK6aS26RLW2tLaqkqqFSA9NX2YALa0QTCkuDRcrRHMk5xpgk5ogJLZSNZIVDoVCFLZiohbIVSLkXLZRHZDgxbHcHrV6rFiBNolNRolEVJbCsdGUzsoyhiEcllOC1DowelVmVrOUPPcqqQABZBZAQWDCjotKANJo1NqdboC4Wi8VBSXIKADeXDUbjf4kwFkkEILbg8RZMHKOzWKzKJkHJa086Xa4qZS4pUisUSqU+QgkYnsQ0zcnJaRLDbpZwKNQSBYspm2MEyC5KTnaDSSd18h7K71q32EwMxYPA0BJFLKY5yZxIrKSURM0RnFHSBTrQqQ9babQejBCr2q9XSiBcWCUfjIMCUIn6oNxEPGtTWFFR0RUy7iGzt+3Ip0XURXVZKPvVCfIKczyB+vyzqLzoGzcuIG0MGTyCztjRtjaJjbHVMNAUTdu1PUhz0vYhryLOcSwXMthBfK0ZGsLQGBZekCi0Jso1IdI23WG04zOE4wIg6coIgBox3Imdi1JRdnxNOxSHNSQkWtW0mTjMxMQ7fDzgcbNKn7WjKJeN4Pi+MAfj+e84MfUMFHbZZwxOHZNDyO09gQOQjmAhZJCM9IMjIycKOvQUwCCbBiAAI2sshpNkiB6NLJ9EIQBQbWOdJlMhYCUjbJkchXGsFmsJQMVsWl3BzKp4GiHoAXgjykgAWmkZZ6xy3LZF2EobCy6xsQWJQ42kE4FjA-EwBSxTjSRUhDgqkzgO2BxdykU4AvXFQ-KjMC8yHKV6qNJi6WOdcypcZsXGxe0JG0XySKjM5lKsMyLwsiAxsYzylDfONznUEqrmi+1ThkHqXDONbULi1wgA */
  id: "node",
  context: ({ input }) => ({
    buffer: [],
    channelId: null,
    connectTo: input.connectTo,
    domain: input.domain ?? DOMAIN,
    handshakeBuffer: [],
    name: input.name,
    requests: [],
    target: void 0,
    targetOrigin: null
  }),
  // Always listen for handshake syn messages. The channel could have
  // disconnected without being able to notify the node, and so need to
  // re-establish the connection.
  invoke: {
    id: "listen for handshake syn",
    src: "listen",
    input: listenInputFromContext({
      include: MSG_HANDSHAKE_SYN,
      responseType: "handshake.syn"
    })
  },
  on: {
    "request.success": {
      actions: "remove request"
    },
    "request.failed": {
      actions: "remove request"
    },
    "request.aborted": {
      actions: "remove request"
    },
    "handshake.syn": {
      actions: "set connection config",
      target: ".handshaking"
    }
  },
  initial: "idle",
  states: {
    idle: {
      entry: [{ type: "emit status", params: { status: "idle" } }],
      on: {
        post: {
          actions: "buffer message"
        }
      }
    },
    handshaking: {
      guard: "hasSource",
      entry: ["send handshake syn ack", { type: "emit status", params: { status: "handshaking" } }],
      invoke: [
        {
          id: "listen for handshake ack",
          src: "listen",
          input: listenInputFromContext({
            include: MSG_HANDSHAKE_ACK,
            count: 1,
            // Override the default `message.received` responseType to prevent
            // buffering the ack message. We transition to the connected state
            // using onDone instead of listening to this event using `on`
            responseType: "handshake.complete"
          }),
          onDone: "connected"
        },
        {
          id: "listen for disconnect",
          src: "listen",
          input: listenInputFromContext({
            include: MSG_DISCONNECT,
            count: 1,
            responseType: "disconnect"
          })
        },
        {
          id: "listen for messages",
          src: "listen",
          input: listenInputFromContext({
            exclude: [
              MSG_DISCONNECT,
              MSG_HANDSHAKE_SYN,
              MSG_HANDSHAKE_ACK,
              MSG_HEARTBEAT,
              MSG_RESPONSE
            ]
          })
        }
      ],
      on: {
        request: {
          actions: "create request"
        },
        post: {
          actions: "buffer message"
        },
        "message.received": {
          actions: "buffer incoming message"
        },
        disconnect: {
          target: "idle"
        }
      }
    },
    connected: {
      entry: [
        "flush handshake buffer",
        "flush buffer",
        { type: "emit status", params: { status: "connected" } }
      ],
      invoke: [
        {
          id: "listen for messages",
          src: "listen",
          input: listenInputFromContext({
            exclude: [
              MSG_DISCONNECT,
              MSG_HANDSHAKE_SYN,
              MSG_HANDSHAKE_ACK,
              MSG_HEARTBEAT,
              MSG_RESPONSE
            ]
          })
        },
        {
          id: "listen for heartbeat",
          src: "listen",
          input: listenInputFromContext({
            include: MSG_HEARTBEAT,
            responseType: "heartbeat.received"
          })
        },
        {
          id: "listen for disconnect",
          src: "listen",
          input: listenInputFromContext({
            include: MSG_DISCONNECT,
            count: 1,
            responseType: "disconnect"
          })
        }
      ],
      on: {
        request: {
          actions: "create request"
        },
        post: {
          actions: "post"
        },
        disconnect: {
          target: "idle"
        },
        "message.received": {
          actions: ["send response", "emit received message"]
        },
        "heartbeat.received": {
          actions: ["send response", "emit heartbeat"]
        }
      }
    }
  }
}), createNode = (input, machine = createNodeMachine()) => {
  const actor = createActor(machine, {
    input
  }), on = (type, handler) => {
    const { unsubscribe } = actor.on(
      // @ts-expect-error @todo ReceivedEmitEvent causes this
      type,
      (event) => {
        handler(event.message.data);
      }
    );
    return unsubscribe;
  }, onStatus = (handler, filter2) => {
    const { unsubscribe } = actor.on(
      // @ts-expect-error @todo ReceivedEmitEvent causes this
      "_status",
      (event) => {
        filter2 && event.status !== filter2 || handler(event.status);
      }
    );
    return unsubscribe;
  }, post = (type, data) => {
    const _data = { type, data };
    actor.send({ type: "post", data: _data });
  }, fetch = (type, data, options) => {
    const { responseTimeout = FETCH_TIMEOUT_DEFAULT, signal, suppressWarnings } = options || {}, resolvable = Promise.withResolvers(), _data = { type, data };
    return actor.send({
      type: "post",
      data: _data,
      resolvable,
      options: { responseTimeout, signal, suppressWarnings }
    }), resolvable.promise;
  }, stop = () => {
    actor.stop();
  };
  return {
    actor,
    fetch,
    machine,
    on,
    onStatus,
    post,
    start: () => (actor.start(), stop),
    stop
  };
};
export {
  DOMAIN,
  FETCH_TIMEOUT_DEFAULT,
  HANDSHAKE_INTERVAL,
  HANDSHAKE_MSG_TYPES,
  HEARTBEAT_INTERVAL,
  INTERNAL_MSG_TYPES,
  MSG_DISCONNECT,
  MSG_HANDSHAKE_ACK,
  MSG_HANDSHAKE_SYN,
  MSG_HANDSHAKE_SYN_ACK,
  MSG_HEARTBEAT,
  MSG_RESPONSE,
  RESPONSE_TIMEOUT_DEFAULT,
  createConnection,
  createConnectionMachine,
  createController,
  createListenLogic,
  createNode,
  createNodeMachine,
  createRequestMachine
};
//# sourceMappingURL=index.js.map
