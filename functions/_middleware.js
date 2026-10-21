export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === "modif-in.pages.dev") {
    return Response.redirect(`https://modif.in${url.pathname}${url.search}`, 301);
  }
  return context.next();
}
