export default defineNuxtRouteMiddleware((to, _from) => {
  const { loggedIn, user } = useUserSession();

  if (!loggedIn.value) {
    return navigateTo(
      `/login${to ? "?redirect=" + encodeURIComponent(to.path) : ""}`,
    );
  }

  if (user.value?.admin !== true) {
    return navigateTo("/");
  }
});
