try {
	;(() => {
		var l = __STORYBOOK_API__,
			{
				ActiveTabs: h,
				Consumer: O,
				ManagerContext: d,
				Provider: m,
				RequestResponseError: A,
				addons: a,
				combineParameters: y,
				controlOrMetaKey: R,
				controlOrMetaSymbol: U,
				eventMatchesShortcut: C,
				eventToShortcut: b,
				experimental_MockUniversalStore: N,
				experimental_UniversalStore: M,
				experimental_requestResponse: g,
				experimental_useUniversalStore: k,
				isMacLike: w,
				isShortcutTaken: B,
				keyToSymbol: L,
				merge: v,
				mockChannel: Y,
				optionOrAltSymbol: D,
				shortcutMatchesShortcut: J,
				shortcutToHumanString: P,
				types: K,
				useAddonState: x,
				useArgTypes: G,
				useArgs: Z,
				useChannel: j,
				useGlobalTypes: z,
				useGlobals: X,
				useParameter: V,
				useSharedState: Q,
				useStoryPrepared: q,
				useStorybookApi: H,
				useStorybookState: f,
			} = __STORYBOOK_API__
		var e = "storybook/links",
			n = { NAVIGATE: `${e}/navigate`, REQUEST: `${e}/request`, RECEIVE: `${e}/receive` }
		a.register(e, (s) => {
			s.on(n.REQUEST, ({ kind: i, name: c }) => {
				const I = s.storyId(i, c)
				s.emit(n.RECEIVE, I)
			})
		})
	})()
} catch (e) {
	console.error("[Storybook] One of your manager-entries failed: " + import.meta.url, e)
}
