import { untrack } from 'svelte';

export type Toast = {
	id: number;
	text: string;
	kind: 'info' | 'pr' | 'error';
	timer?: ReturnType<typeof setTimeout>;
};
let next = 0;
export const toasts = $state<Toast[]>([]);

const dismiss = (id: number) => {
	const i = toasts.findIndex((x) => x.id === id);
	if (i >= 0) toasts.splice(i, 1);
};

// untrack: toast() is often called from effects; it must not subscribe them to the toast list.
export const toast = (text: string, kind: Toast['kind'] = 'info', ms = 3200) =>
	untrack(() => {
		// Same message already showing: keep it up longer instead of stacking duplicates.
		const existing = toasts.find((t) => t.text === text);
		if (existing) {
			clearTimeout(existing.timer);
			existing.timer = setTimeout(() => dismiss(existing.id), ms);
			return;
		}
		const t: Toast = { id: next++, text, kind };
		t.timer = setTimeout(() => dismiss(t.id), ms);
		toasts.push(t);
		if (toasts.length > 3) toasts.shift();
	});
