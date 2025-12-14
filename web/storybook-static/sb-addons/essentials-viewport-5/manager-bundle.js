try {
	;(() => {
		var he = Object.create
		var X = Object.defineProperty
		var me = Object.getOwnPropertyDescriptor
		var fe = Object.getOwnPropertyNames
		var ge = Object.getPrototypeOf,
			we = Object.prototype.hasOwnProperty
		var k = ((e) =>
			typeof require < "u"
				? require
				: typeof Proxy < "u"
					? new Proxy(e, { get: (t, a) => (typeof require < "u" ? require : t)[a] })
					: e)(function (e) {
			if (typeof require < "u") return require.apply(this, arguments)
			throw Error('Dynamic require of "' + e + '" is not supported')
		})
		var U = (e, t) => () => (e && (t = e((e = 0))), t)
		var Se = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports)
		var be = (e, t, a, s) => {
			if ((t && typeof t == "object") || typeof t == "function")
				for (const c of fe(t))
					!we.call(e, c) &&
						c !== a &&
						X(e, c, { get: () => t[c], enumerable: !(s = me(t, c)) || s.enumerable })
			return e
		}
		var ye = (e, t, a) => (
			(a = e != null ? he(ge(e)) : {}),
			be(t || !e || !e.__esModule ? X(a, "default", { value: e, enumerable: !0 }) : a, e)
		)
		var f = U(() => {})
		var g = U(() => {})
		var w = U(() => {})
		var le = Se((ce, Z) => {
			f()
			g()
			w()
			;(function (e) {
				if (typeof ce == "object" && typeof Z < "u") Z.exports = e()
				else if (typeof define == "function" && define.amd) define([], e)
				else {
					var t
					typeof window < "u" || typeof window < "u"
						? (t = window)
						: typeof self < "u"
							? (t = self)
							: (t = this),
						(t.memoizerific = e())
				}
			})(() => {
				var e, t, a
				return (function s(c, S, p) {
					function o(n, d) {
						if (!S[n]) {
							if (!c[n]) {
								var r = typeof k == "function" && k
								if (!d && r) return r(n, !0)
								if (i) return i(n, !0)
								var I = new Error("Cannot find module '" + n + "'")
								throw ((I.code = "MODULE_NOT_FOUND"), I)
							}
							var u = (S[n] = { exports: {} })
							c[n][0].call(
								u.exports,
								(m) => {
									var b = c[n][1][m]
									return o(b || m)
								},
								u,
								u.exports,
								s,
								c,
								S,
								p
							)
						}
						return S[n].exports
					}
					for (var i = typeof k == "function" && k, h = 0; h < p.length; h++) o(p[h])
					return o
				})(
					{
						1: [
							(s, c, S) => {
								c.exports = (p) => {
									if (typeof Map != "function" || p) {
										var o = s("./similar")
										return new o()
									} else return new Map()
								}
							},
							{ "./similar": 2 },
						],
						2: [
							(s, c, S) => {
								function p() {
									return (this.list = []), (this.lastItem = void 0), (this.size = 0), this
								}
								;(p.prototype.get = function (o) {
									var i
									if (this.lastItem && this.isEqual(this.lastItem.key, o)) return this.lastItem.val
									if (((i = this.indexOf(o)), i >= 0))
										return (this.lastItem = this.list[i]), this.list[i].val
								}),
									(p.prototype.set = function (o, i) {
										var h
										return this.lastItem && this.isEqual(this.lastItem.key, o)
											? ((this.lastItem.val = i), this)
											: ((h = this.indexOf(o)),
												h >= 0
													? ((this.lastItem = this.list[h]), (this.list[h].val = i), this)
													: ((this.lastItem = { key: o, val: i }),
														this.list.push(this.lastItem),
														this.size++,
														this))
									}),
									(p.prototype.delete = function (o) {
										var i
										if (
											(this.lastItem &&
												this.isEqual(this.lastItem.key, o) &&
												(this.lastItem = void 0),
											(i = this.indexOf(o)),
											i >= 0)
										)
											return this.size--, this.list.splice(i, 1)[0]
									}),
									(p.prototype.has = function (o) {
										var i
										return this.lastItem && this.isEqual(this.lastItem.key, o)
											? !0
											: ((i = this.indexOf(o)), i >= 0 ? ((this.lastItem = this.list[i]), !0) : !1)
									}),
									(p.prototype.forEach = function (o, i) {
										var h
										for (h = 0; h < this.size; h++)
											o.call(i || this, this.list[h].val, this.list[h].key, this)
									}),
									(p.prototype.indexOf = function (o) {
										var i
										for (i = 0; i < this.size; i++) if (this.isEqual(this.list[i].key, o)) return i
										return -1
									}),
									(p.prototype.isEqual = (o, i) => o === i || (o !== o && i !== i)),
									(c.exports = p)
							},
							{},
						],
						3: [
							(s, c, S) => {
								var p = s("map-or-similar")
								c.exports = (n) => {
									var d = new p(!1),
										r = []
									return (I) => {
										var u = function () {
											var m = d,
												b,
												R,
												y = arguments.length - 1,
												M = Array(y + 1),
												A = !0,
												E
											if ((u.numArgs || u.numArgs === 0) && u.numArgs !== y + 1)
												throw new Error(
													"Memoizerific functions should always be called with the same number of arguments"
												)
											for (E = 0; E < y; E++) {
												if (((M[E] = { cacheItem: m, arg: arguments[E] }), m.has(arguments[E]))) {
													m = m.get(arguments[E])
													continue
												}
												;(A = !1), (b = new p(!1)), m.set(arguments[E], b), (m = b)
											}
											return (
												A && (m.has(arguments[y]) ? (R = m.get(arguments[y])) : (A = !1)),
												A || ((R = I.apply(null, arguments)), m.set(arguments[y], R)),
												n > 0 &&
													((M[y] = { cacheItem: m, arg: arguments[y] }),
													A ? o(r, M) : r.push(M),
													r.length > n && i(r.shift())),
												(u.wasMemoized = A),
												(u.numArgs = y + 1),
												R
											)
										}
										return (u.limit = n), (u.wasMemoized = !1), (u.cache = d), (u.lru = r), u
									}
								}
								function o(n, d) {
									var r = n.length,
										I = d.length,
										u,
										m,
										b
									for (m = 0; m < r; m++) {
										for (u = !0, b = 0; b < I; b++)
											if (!h(n[m][b].arg, d[b].arg)) {
												u = !1
												break
											}
										if (u) break
									}
									n.push(n.splice(m, 1)[0])
								}
								function i(n) {
									var d = n.length,
										r = n[d - 1],
										I,
										u
									for (
										r.cacheItem.delete(r.arg), u = d - 2;
										u >= 0 && ((r = n[u]), (I = r.cacheItem.get(r.arg)), !I || !I.size);
										u--
									)
										r.cacheItem.delete(r.arg)
								}
								function h(n, d) {
									return n === d || (n !== n && d !== d)
								}
							},
							{ "map-or-similar": 1 },
						],
					},
					{},
					[3]
				)(3)
			})
		})
		f()
		g()
		w()
		f()
		g()
		w()
		f()
		g()
		w()
		f()
		g()
		w()
		var l = __REACT__,
			{
				Children: Ke,
				Component: Xe,
				Fragment: D,
				Profiler: Qe,
				PureComponent: $e,
				StrictMode: et,
				Suspense: tt,
				__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: ot,
				cloneElement: nt,
				createContext: rt,
				createElement: V,
				createFactory: it,
				createRef: at,
				forwardRef: ct,
				isValidElement: lt,
				lazy: st,
				memo: Q,
				startTransition: It,
				unstable_act: ut,
				useCallback: $,
				useContext: pt,
				useDebugValue: dt,
				useDeferredValue: ht,
				useEffect: x,
				useId: mt,
				useImperativeHandle: ft,
				useInsertionEffect: gt,
				useLayoutEffect: wt,
				useMemo: St,
				useReducer: bt,
				useRef: ee,
				useState: z,
				useSyncExternalStore: yt,
				useTransition: vt,
				version: Et,
			} = __REACT__
		f()
		g()
		w()
		var Rt = __STORYBOOK_API__,
			{
				ActiveTabs: At,
				Consumer: Ot,
				ManagerContext: kt,
				Provider: xt,
				RequestResponseError: Lt,
				addons: G,
				combineParameters: Bt,
				controlOrMetaKey: Pt,
				controlOrMetaSymbol: Mt,
				eventMatchesShortcut: Dt,
				eventToShortcut: Nt,
				experimental_MockUniversalStore: Ut,
				experimental_UniversalStore: Vt,
				experimental_requestResponse: zt,
				experimental_useUniversalStore: Gt,
				isMacLike: Ht,
				isShortcutTaken: Ft,
				keyToSymbol: Yt,
				merge: qt,
				mockChannel: jt,
				optionOrAltSymbol: Wt,
				shortcutMatchesShortcut: Jt,
				shortcutToHumanString: Zt,
				types: te,
				useAddonState: Kt,
				useArgTypes: Xt,
				useArgs: Qt,
				useChannel: $t,
				useGlobalTypes: eo,
				useGlobals: H,
				useParameter: F,
				useSharedState: to,
				useStoryPrepared: oo,
				useStorybookApi: oe,
				useStorybookState: no,
			} = __STORYBOOK_API__
		f()
		g()
		w()
		var lo = __STORYBOOK_COMPONENTS__,
			{
				A: so,
				ActionBar: Io,
				AddonPanel: uo,
				Badge: po,
				Bar: ho,
				Blockquote: mo,
				Button: fo,
				ClipboardCode: go,
				Code: wo,
				DL: So,
				Div: bo,
				DocumentWrapper: yo,
				EmptyTabContent: vo,
				ErrorFormatter: Eo,
				FlexBar: Co,
				Form: To,
				H1: _o,
				H2: Ro,
				H3: Ao,
				H4: Oo,
				H5: ko,
				H6: xo,
				HR: Lo,
				IconButton: L,
				IconButtonSkeleton: Bo,
				Icons: Po,
				Img: Mo,
				LI: Do,
				Link: No,
				ListItem: Uo,
				Loader: Vo,
				Modal: zo,
				OL: Go,
				P: Ho,
				Placeholder: Fo,
				Pre: Yo,
				ProgressSpinner: qo,
				ResetWrapper: jo,
				ScrollArea: Wo,
				Separator: Jo,
				Spaced: Zo,
				Span: Ko,
				StorybookIcon: Xo,
				StorybookLogo: Qo,
				Symbols: $o,
				SyntaxHighlighter: en,
				TT: tn,
				TabBar: on,
				TabButton: nn,
				TabWrapper: rn,
				Table: an,
				Tabs: cn,
				TabsState: ln,
				TooltipLinkList: Y,
				TooltipMessage: sn,
				TooltipNote: In,
				UL: un,
				WithTooltip: q,
				WithTooltipPure: pn,
				Zoom: dn,
				codeCommon: hn,
				components: mn,
				createCopyToClipboardFunction: fn,
				getStoryHref: gn,
				icons: wn,
				interleaveSeparators: Sn,
				nameSpaceClassNames: bn,
				resetComponents: yn,
				withReset: vn,
			} = __STORYBOOK_COMPONENTS__
		f()
		g()
		w()
		var Rn = __STORYBOOK_THEMING__,
			{
				CacheProvider: An,
				ClassNames: On,
				Global: j,
				ThemeProvider: kn,
				background: xn,
				color: Ln,
				convert: Bn,
				create: Pn,
				createCache: Mn,
				createGlobal: Dn,
				createReset: Nn,
				css: Un,
				darken: Vn,
				ensure: zn,
				ignoreSsrWarning: Gn,
				isPropValid: Hn,
				jsx: Fn,
				keyframes: Yn,
				lighten: qn,
				styled: v,
				themes: jn,
				typography: Wn,
				useTheme: Jn,
				withTheme: Zn,
			} = __STORYBOOK_THEMING__
		f()
		g()
		w()
		var er = __STORYBOOK_ICONS__,
			{
				AccessibilityAltIcon: tr,
				AccessibilityIcon: or,
				AccessibilityIgnoredIcon: nr,
				AddIcon: rr,
				AdminIcon: ir,
				AlertAltIcon: ar,
				AlertIcon: cr,
				AlignLeftIcon: lr,
				AlignRightIcon: sr,
				AppleIcon: Ir,
				ArrowBottomLeftIcon: ur,
				ArrowBottomRightIcon: pr,
				ArrowDownIcon: dr,
				ArrowLeftIcon: hr,
				ArrowRightIcon: mr,
				ArrowSolidDownIcon: fr,
				ArrowSolidLeftIcon: gr,
				ArrowSolidRightIcon: wr,
				ArrowSolidUpIcon: Sr,
				ArrowTopLeftIcon: br,
				ArrowTopRightIcon: yr,
				ArrowUpIcon: vr,
				AzureDevOpsIcon: Er,
				BackIcon: Cr,
				BasketIcon: Tr,
				BatchAcceptIcon: _r,
				BatchDenyIcon: Rr,
				BeakerIcon: Ar,
				BellIcon: Or,
				BitbucketIcon: kr,
				BoldIcon: xr,
				BookIcon: Lr,
				BookmarkHollowIcon: Br,
				BookmarkIcon: Pr,
				BottomBarIcon: Mr,
				BottomBarToggleIcon: Dr,
				BoxIcon: Nr,
				BranchIcon: Ur,
				BrowserIcon: ne,
				ButtonIcon: Vr,
				CPUIcon: zr,
				CalendarIcon: Gr,
				CameraIcon: Hr,
				CameraStabilizeIcon: Fr,
				CategoryIcon: Yr,
				CertificateIcon: qr,
				ChangedIcon: jr,
				ChatIcon: Wr,
				CheckIcon: Jr,
				ChevronDownIcon: Zr,
				ChevronLeftIcon: Kr,
				ChevronRightIcon: Xr,
				ChevronSmallDownIcon: Qr,
				ChevronSmallLeftIcon: $r,
				ChevronSmallRightIcon: ei,
				ChevronSmallUpIcon: ti,
				ChevronUpIcon: oi,
				ChromaticIcon: ni,
				ChromeIcon: ri,
				CircleHollowIcon: ii,
				CircleIcon: ai,
				ClearIcon: ci,
				CloseAltIcon: li,
				CloseIcon: si,
				CloudHollowIcon: Ii,
				CloudIcon: ui,
				CogIcon: pi,
				CollapseIcon: di,
				CommandIcon: hi,
				CommentAddIcon: mi,
				CommentIcon: fi,
				CommentsIcon: gi,
				CommitIcon: wi,
				CompassIcon: Si,
				ComponentDrivenIcon: bi,
				ComponentIcon: yi,
				ContrastIcon: vi,
				ContrastIgnoredIcon: Ei,
				ControlsIcon: Ci,
				CopyIcon: Ti,
				CreditIcon: _i,
				CrossIcon: Ri,
				DashboardIcon: Ai,
				DatabaseIcon: Oi,
				DeleteIcon: ki,
				DiamondIcon: xi,
				DirectionIcon: Li,
				DiscordIcon: Bi,
				DocChartIcon: Pi,
				DocListIcon: Mi,
				DocumentIcon: Di,
				DownloadIcon: Ni,
				DragIcon: Ui,
				EditIcon: Vi,
				EllipsisIcon: zi,
				EmailIcon: Gi,
				ExpandAltIcon: Hi,
				ExpandIcon: Fi,
				EyeCloseIcon: Yi,
				EyeIcon: qi,
				FaceHappyIcon: ji,
				FaceNeutralIcon: Wi,
				FaceSadIcon: Ji,
				FacebookIcon: Zi,
				FailedIcon: Ki,
				FastForwardIcon: Xi,
				FigmaIcon: Qi,
				FilterIcon: $i,
				FlagIcon: ea,
				FolderIcon: ta,
				FormIcon: oa,
				GDriveIcon: na,
				GithubIcon: ra,
				GitlabIcon: ia,
				GlobeIcon: aa,
				GoogleIcon: ca,
				GraphBarIcon: la,
				GraphLineIcon: sa,
				GraphqlIcon: Ia,
				GridAltIcon: ua,
				GridIcon: pa,
				GrowIcon: W,
				HeartHollowIcon: da,
				HeartIcon: ha,
				HomeIcon: ma,
				HourglassIcon: fa,
				InfoIcon: ga,
				ItalicIcon: wa,
				JumpToIcon: Sa,
				KeyIcon: ba,
				LightningIcon: ya,
				LightningOffIcon: va,
				LinkBrokenIcon: Ea,
				LinkIcon: Ca,
				LinkedinIcon: Ta,
				LinuxIcon: _a,
				ListOrderedIcon: Ra,
				ListUnorderedIcon: Aa,
				LocationIcon: Oa,
				LockIcon: ka,
				MarkdownIcon: xa,
				MarkupIcon: La,
				MediumIcon: Ba,
				MemoryIcon: Pa,
				MenuIcon: Ma,
				MergeIcon: Da,
				MirrorIcon: Na,
				MobileIcon: re,
				MoonIcon: Ua,
				NutIcon: Va,
				OutboxIcon: za,
				OutlineIcon: Ga,
				PaintBrushIcon: Ha,
				PaperClipIcon: Fa,
				ParagraphIcon: Ya,
				PassedIcon: qa,
				PhoneIcon: ja,
				PhotoDragIcon: Wa,
				PhotoIcon: Ja,
				PhotoStabilizeIcon: Za,
				PinAltIcon: Ka,
				PinIcon: Xa,
				PlayAllHollowIcon: Qa,
				PlayBackIcon: $a,
				PlayHollowIcon: ec,
				PlayIcon: tc,
				PlayNextIcon: oc,
				PlusIcon: nc,
				PointerDefaultIcon: rc,
				PointerHandIcon: ic,
				PowerIcon: ac,
				PrintIcon: cc,
				ProceedIcon: lc,
				ProfileIcon: sc,
				PullRequestIcon: Ic,
				QuestionIcon: uc,
				RSSIcon: pc,
				RedirectIcon: dc,
				ReduxIcon: hc,
				RefreshIcon: ie,
				ReplyIcon: mc,
				RepoIcon: fc,
				RequestChangeIcon: gc,
				RewindIcon: wc,
				RulerIcon: Sc,
				SaveIcon: bc,
				SearchIcon: yc,
				ShareAltIcon: vc,
				ShareIcon: Ec,
				ShieldIcon: Cc,
				SideBySideIcon: Tc,
				SidebarAltIcon: _c,
				SidebarAltToggleIcon: Rc,
				SidebarIcon: Ac,
				SidebarToggleIcon: Oc,
				SpeakerIcon: kc,
				StackedIcon: xc,
				StarHollowIcon: Lc,
				StarIcon: Bc,
				StatusFailIcon: Pc,
				StatusIcon: Mc,
				StatusPassIcon: Dc,
				StatusWarnIcon: Nc,
				StickerIcon: Uc,
				StopAltHollowIcon: Vc,
				StopAltIcon: zc,
				StopIcon: Gc,
				StorybookIcon: Hc,
				StructureIcon: Fc,
				SubtractIcon: Yc,
				SunIcon: qc,
				SupportIcon: jc,
				SweepIcon: Wc,
				SwitchAltIcon: Jc,
				SyncIcon: Zc,
				TabletIcon: ae,
				ThumbsUpIcon: Kc,
				TimeIcon: Xc,
				TimerIcon: Qc,
				TransferIcon: J,
				TrashIcon: $c,
				TwitterIcon: el,
				TypeIcon: tl,
				UbuntuIcon: ol,
				UndoIcon: nl,
				UnfoldIcon: rl,
				UnlockIcon: il,
				UnpinIcon: al,
				UploadIcon: cl,
				UserAddIcon: ll,
				UserAltIcon: sl,
				UserIcon: Il,
				UsersIcon: ul,
				VSCodeIcon: pl,
				VerifiedIcon: dl,
				VideoIcon: hl,
				WandIcon: ml,
				WatchIcon: fl,
				WindowsIcon: gl,
				WrenchIcon: wl,
				XIcon: Sl,
				YoutubeIcon: bl,
				ZoomIcon: yl,
				ZoomOutIcon: vl,
				ZoomResetIcon: El,
				iconList: Cl,
			} = __STORYBOOK_ICONS__
		var K = ye(le()),
			B = "storybook/viewport",
			O = "viewport",
			ue = {
				mobile1: {
					name: "Small mobile",
					styles: { height: "568px", width: "320px" },
					type: "mobile",
				},
				mobile2: {
					name: "Large mobile",
					styles: { height: "896px", width: "414px" },
					type: "mobile",
				},
				tablet: { name: "Tablet", styles: { height: "1112px", width: "834px" }, type: "tablet" },
			},
			P = { name: "Reset viewport", styles: { height: "100%", width: "100%" }, type: "desktop" },
			Ee = { [O]: { value: void 0, isRotated: !1 } },
			Ce = { viewport: "reset", viewportRotated: !1 },
			Te = globalThis.FEATURES?.viewportStoryGlobals ? Ee : Ce,
			pe = (e, t) => e.indexOf(t),
			_e = (e, t) => {
				const a = pe(e, t)
				return a === e.length - 1 ? e[0] : e[a + 1]
			},
			Re = (e, t) => {
				const a = pe(e, t)
				return a < 1 ? e[e.length - 1] : e[a - 1]
			},
			de = async (e, t, a, s) => {
				await e.setAddonShortcut(B, {
					label: "Previous viewport",
					defaultShortcut: ["alt", "shift", "V"],
					actionName: "previous",
					action: () => {
						a({ viewport: Re(s, t) })
					},
				}),
					await e.setAddonShortcut(B, {
						label: "Next viewport",
						defaultShortcut: ["alt", "V"],
						actionName: "next",
						action: () => {
							a({ viewport: _e(s, t) })
						},
					}),
					await e.setAddonShortcut(B, {
						label: "Reset viewport",
						defaultShortcut: ["alt", "control", "V"],
						actionName: "reset",
						action: () => {
							a(Te)
						},
					})
			},
			Ae = v.div({ display: "inline-flex", alignItems: "center" }),
			se = v.div(({ theme: e }) => ({
				display: "inline-block",
				textDecoration: "none",
				padding: 10,
				fontWeight: e.typography.weight.bold,
				fontSize: e.typography.size.s2 - 1,
				lineHeight: "1",
				height: 40,
				border: "none",
				borderTop: "3px solid transparent",
				borderBottom: "3px solid transparent",
				background: "transparent",
			})),
			Oe = v(L)(() => ({ display: "inline-flex", alignItems: "center" })),
			ke = v.div(({ theme: e }) => ({ fontSize: e.typography.size.s2 - 1, marginLeft: 10 })),
			xe = {
				desktop: l.createElement(ne, null),
				mobile: l.createElement(re, null),
				tablet: l.createElement(ae, null),
				other: l.createElement(D, null),
			},
			Le = ({ api: e }) => {
				const t = F(O),
					[a, s, c] = H(),
					[S, p] = z(!1),
					{ options: o = ue, disable: i } = t || {},
					h = a?.[O] || {},
					n = h.value,
					d = h.isRotated,
					r = o[n] || P,
					I = S || r !== P,
					u = O in c,
					m = Object.keys(o).length
				if (
					(x(() => {
						de(e, n, s, Object.keys(o))
					}, [o, n, s, e]),
					r.styles === null || !o || m < 1)
				)
					return null
				if (typeof r.styles == "function")
					return (
						console.warn(
							"Addon Viewport no longer supports dynamic styles using a function, use css calc() instead"
						),
						null
					)
				const b = d ? r.styles.height : r.styles.width,
					R = d ? r.styles.width : r.styles.height
				return i
					? null
					: l.createElement(Be, {
							item: r,
							updateGlobals: s,
							viewportMap: o,
							viewportName: n,
							isRotated: d,
							setIsTooltipVisible: p,
							isLocked: u,
							isActive: I,
							width: b,
							height: R,
						})
			},
			Be = l.memo((e) => {
				const {
						item: t,
						viewportMap: a,
						viewportName: s,
						isRotated: c,
						updateGlobals: S,
						setIsTooltipVisible: p,
						isLocked: o,
						isActive: i,
						width: h,
						height: n,
					} = e,
					d = $((r) => S({ [O]: r }), [S])
				return l.createElement(
					D,
					null,
					l.createElement(
						q,
						{
							placement: "bottom",
							tooltip: ({ onHide: r }) =>
								l.createElement(Y, {
									links: [
										...(length > 0 && t !== P
											? [
													{
														id: "reset",
														title: "Reset viewport",
														icon: l.createElement(ie, null),
														onClick: () => {
															d({ value: void 0, isRotated: !1 }), r()
														},
													},
												]
											: []),
										...Object.entries(a).map(([I, u]) => ({
											id: I,
											title: u.name,
											icon: xe[u.type],
											active: I === s,
											onClick: () => {
												d({ value: I, isRotated: !1 }), r()
											},
										})),
									].flat(),
								}),
							closeOnOutsideClick: !0,
							onVisibleChange: p,
						},
						l.createElement(
							Oe,
							{
								disabled: o,
								key: "viewport",
								title: "Change the size of the preview",
								active: i,
								onDoubleClick: () => {
									d({ value: void 0, isRotated: !1 })
								},
							},
							l.createElement(W, null),
							t !== P ? l.createElement(ke, null, t.name, " ", c ? "(L)" : "(P)") : null
						)
					),
					l.createElement(j, {
						styles: { 'iframe[data-is-storybook="true"]': { width: h, height: n } },
					}),
					t !== P
						? l.createElement(
								Ae,
								null,
								l.createElement(se, { title: "Viewport width" }, h.replace("px", "")),
								o
									? "/"
									: l.createElement(
											L,
											{
												key: "viewport-rotate",
												title: "Rotate viewport",
												onClick: () => {
													d({ value: s, isRotated: !c })
												},
											},
											l.createElement(J, null)
										),
								l.createElement(se, { title: "Viewport height" }, n.replace("px", ""))
							)
						: null
				)
			}),
			Pe = (0, K.default)(50)((e) => [
				...Me,
				...Object.entries(e).map(([t, { name: a, ...s }]) => ({ ...s, id: t, title: a })),
			]),
			N = { id: "reset", title: "Reset viewport", styles: null, type: "other" },
			Me = [N],
			De = (0, K.default)(50)((e, t, a, s) =>
				e
					.filter((c) => c.id !== N.id || t.id !== c.id)
					.map((c) => ({
						...c,
						onClick: () => {
							a({ viewport: c.id }), s()
						},
					}))
			),
			Ne = ({ width: e, height: t, ...a }) => ({ ...a, height: e, width: t }),
			Ue = v.div({ display: "inline-flex", alignItems: "center" }),
			Ie = v.div(({ theme: e }) => ({
				display: "inline-block",
				textDecoration: "none",
				padding: 10,
				fontWeight: e.typography.weight.bold,
				fontSize: e.typography.size.s2 - 1,
				lineHeight: "1",
				height: 40,
				border: "none",
				borderTop: "3px solid transparent",
				borderBottom: "3px solid transparent",
				background: "transparent",
			})),
			Ve = v(L)(() => ({ display: "inline-flex", alignItems: "center" })),
			ze = v.div(({ theme: e }) => ({ fontSize: e.typography.size.s2 - 1, marginLeft: 10 })),
			Ge = (e, t, a) => {
				if (t === null) return
				const s = typeof t == "function" ? t(e) : t
				return a ? Ne(s) : s
			},
			He = Q(() => {
				const [e, t] = H(),
					{ viewports: a = ue, defaultOrientation: s, defaultViewport: c, disable: S } = F(O, {}),
					p = Pe(a),
					o = oe(),
					[i, h] = z(!1)
				c &&
					!p.find((I) => I.id === c) &&
					console.warn(
						`Cannot find "defaultViewport" of "${c}" in addon-viewport configs, please check the "viewports" setting in the configuration.`
					),
					x(() => {
						de(o, e, t, Object.keys(a))
					}, [a, e, e.viewport, t, o]),
					x(() => {
						const I = s === "landscape"
						;((c && e.viewport !== c) || (s && e.viewportRotated !== I)) &&
							t({ viewport: c, viewportRotated: I })
					}, [s, c, t])
				const n =
						p.find((I) => I.id === e.viewport) ||
						p.find((I) => I.id === c) ||
						p.find((I) => I.default) ||
						N,
					d = ee(),
					r = Ge(d.current, n.styles, e.viewportRotated)
				return (
					x(() => {
						d.current = r
					}, [n]),
					S || Object.entries(a).length === 0
						? null
						: l.createElement(
								D,
								null,
								l.createElement(
									q,
									{
										placement: "top",
										tooltip: ({ onHide: I }) => l.createElement(Y, { links: De(p, n, t, I) }),
										closeOnOutsideClick: !0,
										onVisibleChange: h,
									},
									l.createElement(
										Ve,
										{
											key: "viewport",
											title: "Change the size of the preview",
											active: i || !!r,
											onDoubleClick: () => {
												t({ viewport: N.id })
											},
										},
										l.createElement(W, null),
										r
											? l.createElement(
													ze,
													null,
													e.viewportRotated ? `${n.title} (L)` : `${n.title} (P)`
												)
											: null
									)
								),
								r
									? l.createElement(
											Ue,
											null,
											l.createElement(j, {
												styles: {
													'iframe[data-is-storybook="true"]': {
														...(r || { width: "100%", height: "100%" }),
													},
												},
											}),
											l.createElement(Ie, { title: "Viewport width" }, r.width.replace("px", "")),
											l.createElement(
												L,
												{
													key: "viewport-rotate",
													title: "Rotate viewport",
													onClick: () => {
														t({ viewportRotated: !e.viewportRotated })
													},
												},
												l.createElement(J, null)
											),
											l.createElement(Ie, { title: "Viewport height" }, r.height.replace("px", ""))
										)
									: null
							)
				)
			})
		G.register(B, (e) => {
			G.add(B, {
				title: "viewport / media-queries",
				type: te.TOOL,
				match: ({ viewMode: t, tabId: a }) => t === "story" && !a,
				render: () => (FEATURES?.viewportStoryGlobals ? V(Le, { api: e }) : V(He, null)),
			})
		})
	})()
} catch (e) {
	console.error("[Storybook] One of your manager-entries failed: " + import.meta.url, e)
}
