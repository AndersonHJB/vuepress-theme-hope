import { isPlainObject, isString } from "@vuepress/helper/client";
import { useEventListener } from "@vueuse/core";
import type { VNode } from "vue";
import { computed, defineComponent, h } from "vue";
import { usePageData, usePageFrontmatter, useRoute } from "vuepress/client";

import AutoLink from "@theme-hope/components/AutoLink";
import HopeIcon from "@theme-hope/components/HopeIcon";
import { useNavigate, useThemeLocaleData } from "@theme-hope/composables/index";
import { useSidebarItems } from "@theme-hope/modules/sidebar/composables/index";
import type { ResolvedSidebarItem } from "@theme-hope/modules/sidebar/utils/index";
import { resolveLinkInfo } from "@theme-hope/utils/index";

import type {
  AutoLinkConfig,
  ThemeNormalPageFrontmatter,
} from "../../shared/index.js";

import "../styles/page-nav.scss";

/**
 * Resolve `prev` or `next` config from frontmatter
 */
const resolveFromFrontmatterConfig = (
  config: unknown,
  current: string,
): AutoLinkConfig | null | false =>
  config === false || isPlainObject<AutoLinkConfig>(config)
    ? config
    : isString(config)
      ? resolveLinkInfo(config, true, current)
      : null;

/**
 * Resolve `prev` or `next` config from sidebar items
 */
const resolveFromSidebarItems = (
  sidebarItems: ResolvedSidebarItem[],
  currentPath: string,
  offset: number,
): AutoLinkConfig | null => {
  const index = sidebarItems.findIndex((item) => item.link === currentPath);

  if (index !== -1) {
    const targetItem = sidebarItems[index + offset];

    if (!targetItem?.link) return null;

    return targetItem as AutoLinkConfig;
  }

  for (const item of sidebarItems)
    if ("children" in item) {
      const childResult = resolveFromSidebarItems(
        item.children,
        currentPath,
        offset,
      );

      if (childResult) return childResult;
    }

  return null;
};

export default defineComponent({
  name: "PageNav",

  setup() {
    const themeLocale = useThemeLocaleData();
    const frontmatter = usePageFrontmatter<ThemeNormalPageFrontmatter>();
    const sidebarItems = useSidebarItems();
    const page = usePageData();
    const navigate = useNavigate();
    const route = useRoute();

    const prevNavLink = computed(() => {
      const prevConfig = resolveFromFrontmatterConfig(
        frontmatter.value.prev,
        route.path,
      );

      return prevConfig === false
        ? null
        : prevConfig ??
            (themeLocale.value.prevLink === false
              ? null
              : resolveFromSidebarItems(
                  sidebarItems.value,
                  page.value.path,
                  -1,
                ));
    });

    const nextNavLink = computed(() => {
      const nextConfig = resolveFromFrontmatterConfig(
        frontmatter.value.next,
        route.path,
      );

      return nextConfig === false
        ? null
        : nextConfig ??
            (themeLocale.value.nextLink === false
              ? null
              : resolveFromSidebarItems(
                  sidebarItems.value,
                  page.value.path,
                  1,
                ));
    });

    useEventListener("keydown", (event): void => {
      if (event.altKey)
        if (event.key === "ArrowRight") {
          if (nextNavLink.value) {
            navigate(nextNavLink.value.link);
            event.preventDefault();
          }
        } else if (event.key === "ArrowLeft") {
          if (prevNavLink.value) {
            navigate(prevNavLink.value.link);
            event.preventDefault();
          }
        }
    });

    return (): VNode | null =>
      prevNavLink.value || nextNavLink.value
        ? h("nav", { class: "vp-page-nav" }, [
            prevNavLink.value
              ? h(
                  AutoLink,
                  { class: "prev", config: prevNavLink.value },
                  () => [
                    h("div", { class: "hint" }, [
                      h("span", { class: "arrow start" }),
                      themeLocale.value.metaLocales.prev,
                    ]),
                    h("div", { class: "link" }, [
                      h(HopeIcon, {
                        icon: prevNavLink.value?.icon,
                      }),
                      prevNavLink.value?.text,
                    ]),
                  ],
                )
              : null,
            nextNavLink.value
              ? h(
                  AutoLink,
                  { class: "next", config: nextNavLink.value },
                  () => [
                    h("div", { class: "hint" }, [
                      themeLocale.value.metaLocales.next,
                      h("span", { class: "arrow end" }),
                    ]),
                    h("div", { class: "link" }, [
                      nextNavLink.value?.text,
                      h(HopeIcon, {
                        icon: nextNavLink.value?.icon,
                      }),
                    ]),
                  ],
                )
              : null,
          ])
        : null;
  },
});
