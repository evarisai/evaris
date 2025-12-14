try {
	;(() => {
		var n = __REACT__,
			{
				Children: se,
				Component: ie,
				Fragment: ce,
				Profiler: ue,
				PureComponent: pe,
				StrictMode: de,
				Suspense: me,
				__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: Ie,
				cloneElement: Se,
				createContext: be,
				createElement: _e,
				createFactory: Te,
				createRef: Ee,
				forwardRef: ye,
				isValidElement: Oe,
				lazy: Ce,
				memo: he,
				startTransition: ve,
				unstable_act: Ae,
				useCallback: y,
				useContext: Re,
				useDebugValue: ge,
				useDeferredValue: fe,
				useEffect: R,
				useId: xe,
				useImperativeHandle: Le,
				useInsertionEffect: ke,
				useLayoutEffect: Be,
				useMemo: Ne,
				useReducer: we,
				useRef: k,
				useState: B,
				useSyncExternalStore: Me,
				useTransition: Pe,
				version: Ue,
			} = __REACT__
		var He = __STORYBOOK_API__,
			{
				ActiveTabs: Ke,
				Consumer: Je,
				ManagerContext: ze,
				Provider: Ze,
				RequestResponseError: je,
				addons: g,
				combineParameters: Fe,
				controlOrMetaKey: We,
				controlOrMetaSymbol: Xe,
				eventMatchesShortcut: qe,
				eventToShortcut: Qe,
				experimental_MockUniversalStore: $e,
				experimental_UniversalStore: et,
				experimental_requestResponse: tt,
				experimental_useUniversalStore: ot,
				isMacLike: rt,
				isShortcutTaken: at,
				keyToSymbol: nt,
				merge: lt,
				mockChannel: st,
				optionOrAltSymbol: it,
				shortcutMatchesShortcut: ct,
				shortcutToHumanString: ut,
				types: N,
				useAddonState: pt,
				useArgTypes: dt,
				useArgs: mt,
				useChannel: It,
				useGlobalTypes: w,
				useGlobals: f,
				useParameter: St,
				useSharedState: bt,
				useStoryPrepared: _t,
				useStorybookApi: M,
				useStorybookState: Tt,
			} = __STORYBOOK_API__
		var ht = __STORYBOOK_COMPONENTS__,
			{
				A: vt,
				ActionBar: At,
				AddonPanel: Rt,
				Badge: gt,
				Bar: ft,
				Blockquote: xt,
				Button: Lt,
				ClipboardCode: kt,
				Code: Bt,
				DL: Nt,
				Div: wt,
				DocumentWrapper: Mt,
				EmptyTabContent: Pt,
				ErrorFormatter: Ut,
				FlexBar: Dt,
				Form: Yt,
				H1: Vt,
				H2: Gt,
				H3: Ht,
				H4: Kt,
				H5: Jt,
				H6: zt,
				HR: Zt,
				IconButton: P,
				IconButtonSkeleton: jt,
				Icons: x,
				Img: Ft,
				LI: Wt,
				Link: Xt,
				ListItem: qt,
				Loader: Qt,
				Modal: $t,
				OL: eo,
				P: to,
				Placeholder: oo,
				Pre: ro,
				ProgressSpinner: ao,
				ResetWrapper: no,
				ScrollArea: lo,
				Separator: U,
				Spaced: so,
				Span: io,
				StorybookIcon: co,
				StorybookLogo: uo,
				Symbols: po,
				SyntaxHighlighter: mo,
				TT: Io,
				TabBar: So,
				TabButton: bo,
				TabWrapper: _o,
				Table: To,
				Tabs: Eo,
				TabsState: yo,
				TooltipLinkList: D,
				TooltipMessage: Oo,
				TooltipNote: Co,
				UL: ho,
				WithTooltip: Y,
				WithTooltipPure: vo,
				Zoom: Ao,
				codeCommon: Ro,
				components: go,
				createCopyToClipboardFunction: fo,
				getStoryHref: xo,
				icons: Lo,
				interleaveSeparators: ko,
				nameSpaceClassNames: Bo,
				resetComponents: No,
				withReset: wo,
			} = __STORYBOOK_COMPONENTS__
		var K = { type: "item", value: "" },
			J = (o, t) => ({
				...t,
				name: t.name || o,
				description: t.description || o,
				toolbar: {
					...t.toolbar,
					items: t.toolbar.items.map((e) => {
						const r = typeof e == "string" ? { value: e, title: e } : e
						return (
							r.type === "reset" &&
								t.toolbar.icon &&
								((r.icon = t.toolbar.icon), (r.hideIcon = !0)),
							{ ...K, ...r }
						)
					}),
				},
			}),
			z = ["reset"],
			Z = (o) => o.filter((t) => !z.includes(t.type)).map((t) => t.value),
			S = "addon-toolbars",
			j = async (o, t, e) => {
				e &&
					e.next &&
					(await o.setAddonShortcut(S, {
						label: e.next.label,
						defaultShortcut: e.next.keys,
						actionName: `${t}:next`,
						action: e.next.action,
					})),
					e &&
						e.previous &&
						(await o.setAddonShortcut(S, {
							label: e.previous.label,
							defaultShortcut: e.previous.keys,
							actionName: `${t}:previous`,
							action: e.previous.action,
						})),
					e &&
						e.reset &&
						(await o.setAddonShortcut(S, {
							label: e.reset.label,
							defaultShortcut: e.reset.keys,
							actionName: `${t}:reset`,
							action: e.reset.action,
						}))
			},
			F = (o) => (t) => {
				const {
						id: e,
						toolbar: { items: r, shortcuts: a },
					} = t,
					u = M(),
					[b, i] = f(),
					l = k([]),
					c = b[e],
					O = y(() => {
						i({ [e]: "" })
					}, [i]),
					C = y(() => {
						const s = l.current,
							d = s.indexOf(c),
							m = d === s.length - 1 ? 0 : d + 1,
							p = l.current[m]
						i({ [e]: p })
					}, [l, c, i]),
					h = y(() => {
						const s = l.current,
							d = s.indexOf(c),
							m = d > -1 ? d : 0,
							p = m === 0 ? s.length - 1 : m - 1,
							I = l.current[p]
						i({ [e]: I })
					}, [l, c, i])
				return (
					R(() => {
						a &&
							j(u, e, {
								next: { ...a.next, action: C },
								previous: { ...a.previous, action: h },
								reset: { ...a.reset, action: O },
							})
					}, [u, e, a, C, h, O]),
					R(() => {
						l.current = Z(r)
					}, []),
					n.createElement(o, { cycleValues: l.current, ...t })
				)
			},
			V = ({ currentValue: o, items: t }) =>
				o != null && t.find((e) => e.value === o && e.type !== "reset"),
			W = ({ currentValue: o, items: t }) => {
				const e = V({ currentValue: o, items: t })
				if (e) return e.icon
			},
			X = ({ currentValue: o, items: t }) => {
				const e = V({ currentValue: o, items: t })
				if (e) return e.title
			},
			q = ({ active: o, disabled: t, title: e, icon: r, description: a, onClick: u }) =>
				n.createElement(
					P,
					{ active: o, title: a, disabled: t, onClick: t ? () => {} : u },
					r && n.createElement(x, { icon: r, __suppressDeprecationWarning: !0 }),
					e ? `\xA0${e}` : null
				),
			Q = ({
				right: o,
				title: t,
				value: e,
				icon: r,
				hideIcon: a,
				onClick: u,
				disabled: b,
				currentValue: i,
			}) => {
				const l =
						r &&
						n.createElement(x, {
							style: { opacity: 1 },
							icon: r,
							__suppressDeprecationWarning: !0,
						}),
					c = { id: e ?? "_reset", active: i === e, right: o, title: t, disabled: b, onClick: u }
				return r && !a && (c.icon = l), c
			},
			$ = F(
				({
					id: o,
					name: t,
					description: e,
					toolbar: { icon: r, items: a, title: u, preventDynamicIcon: b, dynamicTitle: i },
				}) => {
					let [l, c, O] = f(),
						[C, h] = B(!1),
						s = l[o],
						d = !!s,
						m = o in O,
						p = r,
						I = u
					b || (p = W({ currentValue: s, items: a }) || p),
						i && (I = X({ currentValue: s, items: a }) || I),
						!I && !p && console.warn(`Toolbar '${t}' has no title or icon`)
					const G = y(
						(A) => {
							c({ [o]: A })
						},
						[o, c]
					)
					return n.createElement(
						Y,
						{
							placement: "top",
							tooltip: ({ onHide: A }) => {
								const H = a
									.filter(({ type: v }) => {
										let L = !0
										return v === "reset" && !s && (L = !1), L
									})
									.map((v) =>
										Q({
											...v,
											currentValue: s,
											disabled: m,
											onClick: () => {
												G(v.value), A()
											},
										})
									)
								return n.createElement(D, { links: H })
							},
							closeOnOutsideClick: !0,
							onVisibleChange: h,
						},
						n.createElement(q, {
							active: C || d,
							disabled: m,
							description: e || "",
							icon: p,
							title: I || "",
						})
					)
				}
			),
			ee = () => {
				const o = w(),
					t = Object.keys(o).filter((e) => !!o[e].toolbar)
				return t.length
					? n.createElement(
							n.Fragment,
							null,
							n.createElement(U, null),
							t.map((e) => {
								const r = J(e, o[e])
								return n.createElement($, { key: e, id: e, ...r })
							})
						)
					: null
			}
		g.register(S, () =>
			g.add(S, {
				title: S,
				type: N.TOOL,
				match: ({ tabId: o }) => !o,
				render: () => n.createElement(ee, null),
			})
		)
	})()
} catch (e) {
	console.error("[Storybook] One of your manager-entries failed: " + import.meta.url, e)
}
