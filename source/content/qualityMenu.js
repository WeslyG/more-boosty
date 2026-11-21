export const wireQualityMenu = (menu, trigger, list, floating) => {
  const links = Array.from(list.querySelectorAll('a'));
  const isOpen = () => floating ? list.matches(':popover-open') : menu.open;
  const setOpen = (open) => {
    if (floating) {
      if (open) list.showPopover();
      else list.hidePopover();
    } else {
      menu.open = open;
    }
  };
  const closeAndRestoreFocus = () => {
    setOpen(false);
    trigger.focus({ preventScroll: true });
  };

  if (floating) {
    list.popover = 'auto';
    trigger.popoverTargetElement = list;
    list.addEventListener('beforetoggle', ({ newState }) => {
      if (newState !== 'open') return;
      const box = trigger.getBoundingClientRect();
      const view = trigger.ownerDocument.defaultView;
      const below = view.innerHeight - box.bottom;
      const above = box.top > below && below < links.length * 30 + 12;
      list.style.top = above ? 'auto' : (box.bottom + 4) + 'px';
      list.style.bottom = above ? (view.innerHeight - box.top + 4) + 'px' : 'auto';
      list.style.left = box.left + 'px';
      list.style.width = box.width + 'px';
      list.style.maxHeight = Math.max(0, (above ? box.top : below) - 8) + 'px';
    });
  }

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    const open = !isOpen();
    setOpen(open);
    if (open && event.detail === 0) links[0]?.focus();
  });
  menu.addEventListener('focusout', (event) => {
    if (isOpen() && event.relatedTarget && !menu.contains(event.relatedTarget)) setOpen(false);
  });
  list.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeAndRestoreFocus();
  });
  list.addEventListener('pointermove', (event) => {
    list.toggleAttribute('data-pointer', !!event.target.closest('a'));
  });
  list.addEventListener('focusin', () => list.removeAttribute('data-pointer'));
  list.addEventListener('pointerleave', () => list.removeAttribute('data-pointer'));
  menu.addEventListener('keydown', (event) => {
    list.removeAttribute('data-pointer');
    const { key, target } = event;
    const open = isOpen();
    const backToTrigger = key === 'Tab' && event.shiftKey && target === links[0];
    if (open && (key === 'Escape' || backToTrigger)) {
      event.preventDefault();
      event.stopPropagation();
      closeAndRestoreFocus();
      return;
    }

    const index = links.indexOf(target);
    let next;
    if (key === 'Tab' && !event.shiftKey && open && target === trigger) next = links[0];
    else if (key === 'ArrowDown') next = links[Math.min(index + 1, links.length - 1)];
    else if (key === 'ArrowUp') next = links[index < 0 ? links.length - 1 : Math.max(index - 1, 0)];
    else if (open && key === 'Home') next = links[0];
    else if (open && key === 'End') next = links.at(-1);
    if (!next) return;

    event.preventDefault();
    event.stopPropagation();
    if (!open) setOpen(true);
    next.focus();
  });
};
