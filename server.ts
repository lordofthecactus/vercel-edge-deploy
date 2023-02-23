// Virtual entry point for the app
import * as remixBuild from '@remix-run/dev/server-build';
import {createStorefrontClient, storefrontRedirect} from '@shopify/hydrogen';
// import {
//   createCookieSessionStorage,
//   type SessionStorage,
//   type Session,
// } from '@shopify/remix-oxygen';

import {
  AppLoadContext,
  createRequestHandler as createRemixRequestHandler,
  ServerBuild,
} from '@remix-run/server-runtime';

export declare type GetLoadContextFunction = (
  event: FetchEvent,
) => AppLoadContext;

/**
 * Export a fetch handler in module format.
 */
export default {
  async fetch(
    request: Request,
    env: Env,
    executionContext: ExecutionContext,
  ): Promise<Response> {
    try {
      /**
       * Open a cache instance in the worker and a custom session instance.
       */
      // if (!env?.SESSION_SECRET) {
      //   throw new Error('SESSION_SECRET environment variable is not set');
      // }

      const waitUntil = (p: Promise<any>) => executionContext.waitUntil(p);
      // const [cache, session] = await Promise.all([
      //   caches.open('hydrogen'),
      //   HydrogenSession.init(request, [env.SESSION_SECRET]),
      // ]);

      /**
       * Create Hydrogen's Storefront client.
       */
      const {storefront} = createStorefrontClient({
        // cache,
        waitUntil,
        // buyerIp: getBuyerIp(request),
        i18n: {language: 'EN', country: 'US'},
        publicStorefrontToken: env.PUBLIC_STOREFRONT_API_TOKEN,
        privateStorefrontToken: env.PRIVATE_STOREFRONT_API_TOKEN,
        storeDomain: `https://${env.PUBLIC_STORE_DOMAIN}`,
        storefrontApiVersion: env.PUBLIC_STOREFRONT_API_VERSION || '2023-01',
        storefrontId: env.PUBLIC_STOREFRONT_ID,
        requestGroupId: request.headers.get('request-id'),
      });

      /*
       * Create a Remix request handler and pass
       * Hydrogen's Storefront client to the loader context.
       */
      const handleRequest = createRequestHandler({
        build: remixBuild as any,
        mode: process.env.NODE_ENV,
        // getLoadContext: () => ({session, storefront, env}),
        getLoadContext: () => ({storefront, env}),
      });

      const response = await handleRequest(request);

      if (response.status === 404) {
        /**
         * Check for redirects only when there's a 404 from the app.
         * If the redirect doesn't exist, then `storefrontRedirect`
         * will pass through the 404 response.
         */
        return storefrontRedirect({request, response, storefront});
      }

      return response;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return new Response('An unexpected error occurred', {status: 500});
    }
  },
};

/**
 * This is a custom session implementation for your Hydrogen shop.
 * Feel free to customize it to your needs, add helper methods, or
 * swap out the cookie-based implementation with something else!
 */
// class HydrogenSession {
//   constructor(
//     private sessionStorage: SessionStorage,
//     private session: Session,
//   ) {}

//   static async init(request: Request, secrets: string[]) {
//     const storage = createCookieSessionStorage({
//       cookie: {
//         name: 'session',
//         httpOnly: true,
//         path: '/',
//         sameSite: 'lax',
//         secrets,
//       },
//     });

//     const session = await storage.getSession(request.headers.get('Cookie'));

//     return new this(storage, session);
//   }

//   get(key: string) {
//     return this.session.get(key);
//   }

//   destroy() {
//     return this.sessionStorage.destroySession(this.session);
//   }

//   flash(key: string, value: any) {
//     this.session.flash(key, value);
//   }

//   unset(key: string) {
//     this.session.unset(key);
//   }

//   set(key: string, value: any) {
//     this.session.set(key, value);
//   }

//   commit() {
//     return this.sessionStorage.commitSession(this.session);
//   }
// }

export function createRequestHandler<Context = unknown>({
  build,
  mode,
  getLoadContext,
}: {
  build: ServerBuild;
  mode?: string;
  getLoadContext?: (request: Request) => Promise<Context> | Context;
}) {
  const handleRequest = createRemixRequestHandler(build, mode);

  return async (request: Request) => {
    return handleRequest(
      request,
      (await getLoadContext?.(request)) as AppLoadContext,
    );
  };
}

export function getBuyerIp(request: Request) {
  // return request.headers.get('oxygen-buyer-ip') ?? undefined;
}

// export async function handleAsset(
//   event: FetchEvent,
//   build: ServerBuild,
//   options?: Partial<KvAssetHandlerOptions>
// ) {
//   try {
//     if (process.env.NODE_ENV === "development") {
//       return await getAssetFromKV(event, {
//         cacheControl: {
//           bypassCache: true,
//         },
//         ...options,
//       });
//     }

//     let cacheControl = {};
//     let url = new URL(event.request.url);
//     let assetpath = build.assets.url.split("/").slice(0, -1).join("/");
//     let requestpath = url.pathname.split("/").slice(0, -1).join("/");

//     if (requestpath.startsWith(assetpath)) {
//       // Assets are hashed by Remix so are safe to cache in the browser
//       // And they're also hashed in KV storage, so are safe to cache on the edge
//       cacheControl = {
//         bypassCache: false,
//         edgeTTL: 31536000,
//         browserTTL: 31536000,
//       };
//     } else {
//       // Assets are not necessarily hashed in the request URL, so we cannot cache in the browser
//       // But they are hashed in KV storage, so we can cache on the edge
//       cacheControl = {
//         bypassCache: false,
//         edgeTTL: 31536000,
//       };
//     }

//     return await getAssetFromKV(event, {
//       cacheControl,
//       ...options,
//     });
//   } catch (error: unknown) {
//     if (
//       error instanceof MethodNotAllowedError ||
//       error instanceof NotFoundError
//     ) {
//       return null;
//     }

//     throw error;
//   }
// }
