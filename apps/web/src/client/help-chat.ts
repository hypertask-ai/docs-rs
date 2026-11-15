type HelpChatWindow = Window & {
  readonly HypertaskHelp?: {
    readonly open?: () => void;
  };
};

// SAFETY: the help widget adds HypertaskHelp to the page window after it loads.
const helpChatWindow = () => window as HelpChatWindow;

const openHelpChat = () => {
  const open = helpChatWindow().HypertaskHelp?.open;

  if (open !== undefined) {
    open();

    return true;
  }

  const launcher = document.querySelector("#chat-widget-btn");

  if (launcher instanceof HTMLElement && launcher.style.display !== "none") {
    launcher.click();

    return true;
  }

  return false;
};

const clickedAskHelp = (event: Event) => {
  const { target } = event;

  return (
    target instanceof Element && target.closest("[data-ask-help]") !== null
  );
};

export const bindHelpChat = () => {
  document.addEventListener("keydown", (event) => {
    if (!event.metaKey || event.key.toLowerCase() !== "i") {
      return;
    }

    const link = document.querySelector("[data-ask-help]");

    if (link instanceof HTMLElement) {
      event.preventDefault();
      link.click();
    }
  });

  document.addEventListener("click", (event) => {
    if (clickedAskHelp(event) && openHelpChat()) {
      event.preventDefault();
    }
  });
};
