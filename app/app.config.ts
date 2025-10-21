export default defineAppConfig({
  ui: {
    button: {
      defaultVariants: {
        size: "lg",
      },
      slots: {
        base: "cursor-pointer",
      },
    },
    colors: {
      neutral: "stone",
      primary: "emerald",
    },
    input: {
      slots: {
        root: "w-full",
      },
    },
    header: {
      slots: {
        root: "bg-default/75 backdrop-blur border-b border-default h-(--ui-header-height) static",
      },
    },
    link: {
      base: "hover:underline",
      variants: {
        active: {
          false: "text-primary-500",
        },
      },
      compoundVariants: [
        {
          active: false,
          disabled: false,
          class: ["hover:text-primary-600", "transition-all"],
        },
      ],
    },
  },
});
