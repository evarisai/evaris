try {
	;(() => {
		var O = __STORYBOOK_API__,
			{
				ActiveTabs: m,
				Consumer: y,
				ManagerContext: b,
				Provider: A,
				RequestResponseError: g,
				addons: n,
				combineParameters: R,
				controlOrMetaKey: U,
				controlOrMetaSymbol: w,
				eventMatchesShortcut: C,
				eventToShortcut: M,
				experimental_MockUniversalStore: N,
				experimental_UniversalStore: B,
				experimental_requestResponse: L,
				experimental_useUniversalStore: Y,
				isMacLike: k,
				isShortcutTaken: v,
				keyToSymbol: J,
				merge: P,
				mockChannel: x,
				optionOrAltSymbol: K,
				shortcutMatchesShortcut: f,
				shortcutToHumanString: j,
				types: D,
				useAddonState: G,
				useArgTypes: Z,
				useArgs: z,
				useChannel: X,
				useGlobalTypes: F,
				useGlobals: H,
				useParameter: V,
				useSharedState: q,
				useStoryPrepared: Q,
				useStorybookApi: W,
				useStorybookState: $,
			} = __STORYBOOK_API__
		var l = (() => {
				let e
				return (
					typeof window < "u"
						? (e = window)
						: typeof globalThis < "u"
							? (e = globalThis)
							: typeof window < "u"
								? (e = window)
								: typeof self < "u"
									? (e = self)
									: (e = {}),
					e
				)
			})(),
			u = "tag-filters",
			I = "static-filter"
		n.register(u, (e) => {
			const p = Object.entries(l.TAGS_OPTIONS ?? {}).reduce((t, s) => {
				const [r, c] = s
				return c.excludeFromSidebar && (t[r] = !0), t
			}, {})
			e.experimental_setFilter(I, (t) => {
				const s = t.tags ?? []
				return (s.includes("dev") || t.type === "docs") && s.filter((r) => p[r]).length === 0
			})
		})
	})()
} catch (e) {
	console.error("[Storybook] One of your manager-entries failed: " + import.meta.url, e)
}
