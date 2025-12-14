try {
	;(() => {
		var re = Object.create
		var j = Object.defineProperty
		var ie = Object.getOwnPropertyDescriptor
		var ce = Object.getOwnPropertyNames
		var ae = Object.getPrototypeOf,
			se = Object.prototype.hasOwnProperty
		var v = ((e) =>
			typeof require < "u"
				? require
				: typeof Proxy < "u"
					? new Proxy(e, { get: (o, a) => (typeof require < "u" ? require : o)[a] })
					: e)(function (e) {
			if (typeof require < "u") return require.apply(this, arguments)
			throw Error('Dynamic require of "' + e + '" is not supported')
		})
		var M = (e, o) => () => (e && (o = e((e = 0))), o)
		var le = (e, o) => () => (o || e((o = { exports: {} }).exports, o), o.exports)
		var Ie = (e, o, a, r) => {
			if ((o && typeof o == "object") || typeof o == "function")
				for (const i of ce(o))
					!se.call(e, i) &&
						i !== a &&
						j(e, i, { get: () => o[i], enumerable: !(r = ie(o, i)) || r.enumerable })
			return e
		}
		var ue = (e, o, a) => (
			(a = e != null ? re(ae(e)) : {}),
			Ie(o || !e || !e.__esModule ? j(a, "default", { value: e, enumerable: !0 }) : a, e)
		)
		var m = M(() => {})
		var h = M(() => {})
		var f = M(() => {})
		var $ = le((Q, q) => {
			m()
			h()
			f()
			;(function (e) {
				if (typeof Q == "object" && typeof q < "u") q.exports = e()
				else if (typeof define == "function" && define.amd) define([], e)
				else {
					var o
					typeof window < "u" || typeof window < "u"
						? (o = window)
						: typeof self < "u"
							? (o = self)
							: (o = this),
						(o.memoizerific = e())
				}
			})(() => {
				var e, o, a
				return (function r(i, d, s) {
					function t(c, u) {
						if (!d[c]) {
							if (!i[c]) {
								var l = typeof v == "function" && v
								if (!u && l) return l(c, !0)
								if (n) return n(c, !0)
								var S = new Error("Cannot find module '" + c + "'")
								throw ((S.code = "MODULE_NOT_FOUND"), S)
							}
							var p = (d[c] = { exports: {} })
							i[c][0].call(
								p.exports,
								(b) => {
									var C = i[c][1][b]
									return t(C || b)
								},
								p,
								p.exports,
								r,
								i,
								d,
								s
							)
						}
						return d[c].exports
					}
					for (var n = typeof v == "function" && v, I = 0; I < s.length; I++) t(s[I])
					return t
				})(
					{
						1: [
							(r, i, d) => {
								i.exports = (s) => {
									if (typeof Map != "function" || s) {
										var t = r("./similar")
										return new t()
									} else return new Map()
								}
							},
							{ "./similar": 2 },
						],
						2: [
							(r, i, d) => {
								function s() {
									return (this.list = []), (this.lastItem = void 0), (this.size = 0), this
								}
								;(s.prototype.get = function (t) {
									var n
									if (this.lastItem && this.isEqual(this.lastItem.key, t)) return this.lastItem.val
									if (((n = this.indexOf(t)), n >= 0))
										return (this.lastItem = this.list[n]), this.list[n].val
								}),
									(s.prototype.set = function (t, n) {
										var I
										return this.lastItem && this.isEqual(this.lastItem.key, t)
											? ((this.lastItem.val = n), this)
											: ((I = this.indexOf(t)),
												I >= 0
													? ((this.lastItem = this.list[I]), (this.list[I].val = n), this)
													: ((this.lastItem = { key: t, val: n }),
														this.list.push(this.lastItem),
														this.size++,
														this))
									}),
									(s.prototype.delete = function (t) {
										var n
										if (
											(this.lastItem &&
												this.isEqual(this.lastItem.key, t) &&
												(this.lastItem = void 0),
											(n = this.indexOf(t)),
											n >= 0)
										)
											return this.size--, this.list.splice(n, 1)[0]
									}),
									(s.prototype.has = function (t) {
										var n
										return this.lastItem && this.isEqual(this.lastItem.key, t)
											? !0
											: ((n = this.indexOf(t)), n >= 0 ? ((this.lastItem = this.list[n]), !0) : !1)
									}),
									(s.prototype.forEach = function (t, n) {
										var I
										for (I = 0; I < this.size; I++)
											t.call(n || this, this.list[I].val, this.list[I].key, this)
									}),
									(s.prototype.indexOf = function (t) {
										var n
										for (n = 0; n < this.size; n++) if (this.isEqual(this.list[n].key, t)) return n
										return -1
									}),
									(s.prototype.isEqual = (t, n) => t === n || (t !== t && n !== n)),
									(i.exports = s)
							},
							{},
						],
						3: [
							(r, i, d) => {
								var s = r("map-or-similar")
								i.exports = (c) => {
									var u = new s(!1),
										l = []
									return (S) => {
										var p = function () {
											var b = u,
												C,
												B,
												k = arguments.length - 1,
												L = Array(k + 1),
												O = !0,
												A
											if ((p.numArgs || p.numArgs === 0) && p.numArgs !== k + 1)
												throw new Error(
													"Memoizerific functions should always be called with the same number of arguments"
												)
											for (A = 0; A < k; A++) {
												if (((L[A] = { cacheItem: b, arg: arguments[A] }), b.has(arguments[A]))) {
													b = b.get(arguments[A])
													continue
												}
												;(O = !1), (C = new s(!1)), b.set(arguments[A], C), (b = C)
											}
											return (
												O && (b.has(arguments[k]) ? (B = b.get(arguments[k])) : (O = !1)),
												O || ((B = S.apply(null, arguments)), b.set(arguments[k], B)),
												c > 0 &&
													((L[k] = { cacheItem: b, arg: arguments[k] }),
													O ? t(l, L) : l.push(L),
													l.length > c && n(l.shift())),
												(p.wasMemoized = O),
												(p.numArgs = k + 1),
												B
											)
										}
										return (p.limit = c), (p.wasMemoized = !1), (p.cache = u), (p.lru = l), p
									}
								}
								function t(c, u) {
									var l = c.length,
										S = u.length,
										p,
										b,
										C
									for (b = 0; b < l; b++) {
										for (p = !0, C = 0; C < S; C++)
											if (!I(c[b][C].arg, u[C].arg)) {
												p = !1
												break
											}
										if (p) break
									}
									c.push(c.splice(b, 1)[0])
								}
								function n(c) {
									var u = c.length,
										l = c[u - 1],
										S,
										p
									for (
										l.cacheItem.delete(l.arg), p = u - 2;
										p >= 0 && ((l = c[p]), (S = l.cacheItem.get(l.arg)), !S || !S.size);
										p--
									)
										l.cacheItem.delete(l.arg)
								}
								function I(c, u) {
									return c === u || (c !== c && u !== u)
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
		m()
		h()
		f()
		m()
		h()
		f()
		m()
		h()
		f()
		m()
		h()
		f()
		var g = __REACT__,
			{
				Children: ve,
				Component: we,
				Fragment: D,
				Profiler: Re,
				PureComponent: Be,
				StrictMode: Le,
				Suspense: xe,
				__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: Pe,
				cloneElement: Me,
				createContext: De,
				createElement: Ue,
				createFactory: Ge,
				createRef: Ne,
				forwardRef: Fe,
				isValidElement: He,
				lazy: ze,
				memo: w,
				startTransition: Ye,
				unstable_act: Ke,
				useCallback: U,
				useContext: qe,
				useDebugValue: Ve,
				useDeferredValue: je,
				useEffect: Je,
				useId: Ze,
				useImperativeHandle: We,
				useInsertionEffect: Xe,
				useLayoutEffect: Qe,
				useMemo: J,
				useReducer: $e,
				useRef: eo,
				useState: G,
				useSyncExternalStore: oo,
				useTransition: no,
				version: to,
			} = __REACT__
		m()
		h()
		f()
		var so = __STORYBOOK_API__,
			{
				ActiveTabs: lo,
				Consumer: Io,
				ManagerContext: uo,
				Provider: po,
				RequestResponseError: mo,
				addons: N,
				combineParameters: ho,
				controlOrMetaKey: fo,
				controlOrMetaSymbol: go,
				eventMatchesShortcut: bo,
				eventToShortcut: So,
				experimental_MockUniversalStore: Co,
				experimental_UniversalStore: yo,
				experimental_requestResponse: _o,
				experimental_useUniversalStore: Eo,
				isMacLike: To,
				isShortcutTaken: ko,
				keyToSymbol: Ao,
				merge: Oo,
				mockChannel: vo,
				optionOrAltSymbol: wo,
				shortcutMatchesShortcut: Ro,
				shortcutToHumanString: Bo,
				types: Z,
				useAddonState: Lo,
				useArgTypes: xo,
				useArgs: Po,
				useChannel: Mo,
				useGlobalTypes: Do,
				useGlobals: x,
				useParameter: P,
				useSharedState: Uo,
				useStoryPrepared: Go,
				useStorybookApi: No,
				useStorybookState: Fo,
			} = __STORYBOOK_API__
		m()
		h()
		f()
		var qo = __STORYBOOK_COMPONENTS__,
			{
				A: Vo,
				ActionBar: jo,
				AddonPanel: Jo,
				Badge: Zo,
				Bar: Wo,
				Blockquote: Xo,
				Button: Qo,
				ClipboardCode: $o,
				Code: en,
				DL: on,
				Div: nn,
				DocumentWrapper: tn,
				EmptyTabContent: rn,
				ErrorFormatter: cn,
				FlexBar: an,
				Form: sn,
				H1: ln,
				H2: In,
				H3: un,
				H4: dn,
				H5: pn,
				H6: mn,
				HR: hn,
				IconButton: R,
				IconButtonSkeleton: fn,
				Icons: gn,
				Img: bn,
				LI: Sn,
				Link: Cn,
				ListItem: yn,
				Loader: _n,
				Modal: En,
				OL: Tn,
				P: kn,
				Placeholder: An,
				Pre: On,
				ProgressSpinner: vn,
				ResetWrapper: wn,
				ScrollArea: Rn,
				Separator: Bn,
				Spaced: Ln,
				Span: xn,
				StorybookIcon: Pn,
				StorybookLogo: Mn,
				Symbols: Dn,
				SyntaxHighlighter: Un,
				TT: Gn,
				TabBar: Nn,
				TabButton: Fn,
				TabWrapper: Hn,
				Table: zn,
				Tabs: Yn,
				TabsState: Kn,
				TooltipLinkList: F,
				TooltipMessage: qn,
				TooltipNote: Vn,
				UL: jn,
				WithTooltip: H,
				WithTooltipPure: Jn,
				Zoom: Zn,
				codeCommon: Wn,
				components: Xn,
				createCopyToClipboardFunction: Qn,
				getStoryHref: $n,
				icons: et,
				interleaveSeparators: ot,
				nameSpaceClassNames: nt,
				resetComponents: tt,
				withReset: rt,
			} = __STORYBOOK_COMPONENTS__
		m()
		h()
		f()
		var lt = __STORYBOOK_ICONS__,
			{
				AccessibilityAltIcon: It,
				AccessibilityIcon: ut,
				AccessibilityIgnoredIcon: dt,
				AddIcon: pt,
				AdminIcon: mt,
				AlertAltIcon: ht,
				AlertIcon: ft,
				AlignLeftIcon: gt,
				AlignRightIcon: bt,
				AppleIcon: St,
				ArrowBottomLeftIcon: Ct,
				ArrowBottomRightIcon: yt,
				ArrowDownIcon: _t,
				ArrowLeftIcon: Et,
				ArrowRightIcon: Tt,
				ArrowSolidDownIcon: kt,
				ArrowSolidLeftIcon: At,
				ArrowSolidRightIcon: Ot,
				ArrowSolidUpIcon: vt,
				ArrowTopLeftIcon: wt,
				ArrowTopRightIcon: Rt,
				ArrowUpIcon: Bt,
				AzureDevOpsIcon: Lt,
				BackIcon: xt,
				BasketIcon: Pt,
				BatchAcceptIcon: Mt,
				BatchDenyIcon: Dt,
				BeakerIcon: Ut,
				BellIcon: Gt,
				BitbucketIcon: Nt,
				BoldIcon: Ft,
				BookIcon: Ht,
				BookmarkHollowIcon: zt,
				BookmarkIcon: Yt,
				BottomBarIcon: Kt,
				BottomBarToggleIcon: qt,
				BoxIcon: Vt,
				BranchIcon: jt,
				BrowserIcon: Jt,
				ButtonIcon: Zt,
				CPUIcon: Wt,
				CalendarIcon: Xt,
				CameraIcon: Qt,
				CameraStabilizeIcon: $t,
				CategoryIcon: er,
				CertificateIcon: or,
				ChangedIcon: nr,
				ChatIcon: tr,
				CheckIcon: rr,
				ChevronDownIcon: ir,
				ChevronLeftIcon: cr,
				ChevronRightIcon: ar,
				ChevronSmallDownIcon: sr,
				ChevronSmallLeftIcon: lr,
				ChevronSmallRightIcon: Ir,
				ChevronSmallUpIcon: ur,
				ChevronUpIcon: dr,
				ChromaticIcon: pr,
				ChromeIcon: mr,
				CircleHollowIcon: hr,
				CircleIcon: W,
				ClearIcon: fr,
				CloseAltIcon: gr,
				CloseIcon: br,
				CloudHollowIcon: Sr,
				CloudIcon: Cr,
				CogIcon: yr,
				CollapseIcon: _r,
				CommandIcon: Er,
				CommentAddIcon: Tr,
				CommentIcon: kr,
				CommentsIcon: Ar,
				CommitIcon: Or,
				CompassIcon: vr,
				ComponentDrivenIcon: wr,
				ComponentIcon: Rr,
				ContrastIcon: Br,
				ContrastIgnoredIcon: Lr,
				ControlsIcon: xr,
				CopyIcon: Pr,
				CreditIcon: Mr,
				CrossIcon: Dr,
				DashboardIcon: Ur,
				DatabaseIcon: Gr,
				DeleteIcon: Nr,
				DiamondIcon: Fr,
				DirectionIcon: Hr,
				DiscordIcon: zr,
				DocChartIcon: Yr,
				DocListIcon: Kr,
				DocumentIcon: qr,
				DownloadIcon: Vr,
				DragIcon: jr,
				EditIcon: Jr,
				EllipsisIcon: Zr,
				EmailIcon: Wr,
				ExpandAltIcon: Xr,
				ExpandIcon: Qr,
				EyeCloseIcon: $r,
				EyeIcon: ei,
				FaceHappyIcon: oi,
				FaceNeutralIcon: ni,
				FaceSadIcon: ti,
				FacebookIcon: ri,
				FailedIcon: ii,
				FastForwardIcon: ci,
				FigmaIcon: ai,
				FilterIcon: si,
				FlagIcon: li,
				FolderIcon: Ii,
				FormIcon: ui,
				GDriveIcon: di,
				GithubIcon: pi,
				GitlabIcon: mi,
				GlobeIcon: hi,
				GoogleIcon: fi,
				GraphBarIcon: gi,
				GraphLineIcon: bi,
				GraphqlIcon: Si,
				GridAltIcon: Ci,
				GridIcon: z,
				GrowIcon: yi,
				HeartHollowIcon: _i,
				HeartIcon: Ei,
				HomeIcon: Ti,
				HourglassIcon: ki,
				InfoIcon: Ai,
				ItalicIcon: Oi,
				JumpToIcon: vi,
				KeyIcon: wi,
				LightningIcon: Ri,
				LightningOffIcon: Bi,
				LinkBrokenIcon: Li,
				LinkIcon: xi,
				LinkedinIcon: Pi,
				LinuxIcon: Mi,
				ListOrderedIcon: Di,
				ListUnorderedIcon: Ui,
				LocationIcon: Gi,
				LockIcon: Ni,
				MarkdownIcon: Fi,
				MarkupIcon: Hi,
				MediumIcon: zi,
				MemoryIcon: Yi,
				MenuIcon: Ki,
				MergeIcon: qi,
				MirrorIcon: Vi,
				MobileIcon: ji,
				MoonIcon: Ji,
				NutIcon: Zi,
				OutboxIcon: Wi,
				OutlineIcon: Xi,
				PaintBrushIcon: Qi,
				PaperClipIcon: $i,
				ParagraphIcon: ec,
				PassedIcon: oc,
				PhoneIcon: nc,
				PhotoDragIcon: tc,
				PhotoIcon: Y,
				PhotoStabilizeIcon: rc,
				PinAltIcon: ic,
				PinIcon: cc,
				PlayAllHollowIcon: ac,
				PlayBackIcon: sc,
				PlayHollowIcon: lc,
				PlayIcon: Ic,
				PlayNextIcon: uc,
				PlusIcon: dc,
				PointerDefaultIcon: pc,
				PointerHandIcon: mc,
				PowerIcon: hc,
				PrintIcon: fc,
				ProceedIcon: gc,
				ProfileIcon: bc,
				PullRequestIcon: Sc,
				QuestionIcon: Cc,
				RSSIcon: yc,
				RedirectIcon: _c,
				ReduxIcon: Ec,
				RefreshIcon: X,
				ReplyIcon: Tc,
				RepoIcon: kc,
				RequestChangeIcon: Ac,
				RewindIcon: Oc,
				RulerIcon: vc,
				SaveIcon: wc,
				SearchIcon: Rc,
				ShareAltIcon: Bc,
				ShareIcon: Lc,
				ShieldIcon: xc,
				SideBySideIcon: Pc,
				SidebarAltIcon: Mc,
				SidebarAltToggleIcon: Dc,
				SidebarIcon: Uc,
				SidebarToggleIcon: Gc,
				SpeakerIcon: Nc,
				StackedIcon: Fc,
				StarHollowIcon: Hc,
				StarIcon: zc,
				StatusFailIcon: Yc,
				StatusIcon: Kc,
				StatusPassIcon: qc,
				StatusWarnIcon: Vc,
				StickerIcon: jc,
				StopAltHollowIcon: Jc,
				StopAltIcon: Zc,
				StopIcon: Wc,
				StorybookIcon: Xc,
				StructureIcon: Qc,
				SubtractIcon: $c,
				SunIcon: ea,
				SupportIcon: oa,
				SweepIcon: na,
				SwitchAltIcon: ta,
				SyncIcon: ra,
				TabletIcon: ia,
				ThumbsUpIcon: ca,
				TimeIcon: aa,
				TimerIcon: sa,
				TransferIcon: la,
				TrashIcon: Ia,
				TwitterIcon: ua,
				TypeIcon: da,
				UbuntuIcon: pa,
				UndoIcon: ma,
				UnfoldIcon: ha,
				UnlockIcon: fa,
				UnpinIcon: ga,
				UploadIcon: ba,
				UserAddIcon: Sa,
				UserAltIcon: Ca,
				UserIcon: ya,
				UsersIcon: _a,
				VSCodeIcon: Ea,
				VerifiedIcon: Ta,
				VideoIcon: ka,
				WandIcon: Aa,
				WatchIcon: Oa,
				WindowsIcon: va,
				WrenchIcon: wa,
				XIcon: Ra,
				YoutubeIcon: Ba,
				ZoomIcon: La,
				ZoomOutIcon: xa,
				ZoomResetIcon: Pa,
				iconList: Ma,
			} = __STORYBOOK_ICONS__
		m()
		h()
		f()
		var Fa = __STORYBOOK_CLIENT_LOGGER__,
			{ deprecate: Ha, logger: K, once: za, pretty: Ya } = __STORYBOOK_CLIENT_LOGGER__
		var V = ue($())
		m()
		h()
		f()
		var Qa = __STORYBOOK_THEMING__,
			{
				CacheProvider: $a,
				ClassNames: es,
				Global: os,
				ThemeProvider: ns,
				background: ts,
				color: rs,
				convert: is,
				create: cs,
				createCache: as,
				createGlobal: ss,
				createReset: ls,
				css: Is,
				darken: us,
				ensure: ds,
				ignoreSsrWarning: ps,
				isPropValid: ms,
				jsx: hs,
				keyframes: fs,
				lighten: gs,
				styled: ee,
				themes: bs,
				typography: Ss,
				useTheme: Cs,
				withTheme: ys,
			} = __STORYBOOK_THEMING__
		m()
		h()
		f()
		function oe(e) {
			for (var o = [], a = 1; a < arguments.length; a++) o[a - 1] = arguments[a]
			var r = Array.from(typeof e == "string" ? [e] : e)
			r[r.length - 1] = r[r.length - 1].replace(/\r?\n([\t ]*)$/, "")
			var i = r.reduce((t, n) => {
				var I = n.match(/\n([\t ]+|(?!\s).)/g)
				return I
					? t.concat(
							I.map((c) => {
								var u, l
								return (l =
									(u = c.match(/[\t ]/g)) === null || u === void 0 ? void 0 : u.length) !== null &&
									l !== void 0
									? l
									: 0
							})
						)
					: t
			}, [])
			if (i.length) {
				var d = new RegExp(
					`
[	 ]{` +
						Math.min.apply(Math, i) +
						"}",
					"g"
				)
				r = r.map((t) => t.replace(
						d,
						`
`
					))
			}
			r[0] = r[0].replace(/^\r?\n/, "")
			var s = r[0]
			return (
				o.forEach((t, n) => {
					var I = s.match(/(?:^|\n)( *)$/),
						c = I ? I[1] : "",
						u = t
					typeof t == "string" &&
						t.includes(`
`) &&
						(u = String(t)
							.split(`
`)
							.map((l, S) => S === 0 ? l : "" + c + l)
							.join(`
`)),
						(s += u + r[n + 1])
				}),
				s
			)
		}
		var ne = "storybook/background",
			y = "backgrounds",
			de = { light: { name: "light", value: "#F8F8F8" }, dark: { name: "dark", value: "#333" } },
			pe = w(() => {
				const e = P(y),
					[o, a, r] = x(),
					[i, d] = G(!1),
					{ options: s = de, disable: t = !0 } = e || {}
				if (t) return null
				const n = o[y] || {},
					I = n.value,
					c = n.grid || !1,
					u = s[I],
					l = !!r?.[y],
					S = Object.keys(s).length
				return g.createElement(me, {
					length: S,
					backgroundMap: s,
					item: u,
					updateGlobals: a,
					backgroundName: I,
					setIsTooltipVisible: d,
					isLocked: l,
					isGridActive: c,
					isTooltipVisible: i,
				})
			}),
			me = w((e) => {
				const {
						item: o,
						length: a,
						updateGlobals: r,
						setIsTooltipVisible: i,
						backgroundMap: d,
						backgroundName: s,
						isLocked: t,
						isGridActive: n,
						isTooltipVisible: I,
					} = e,
					c = U(
						(u) => {
							r({ [y]: u })
						},
						[r]
					)
				return g.createElement(
					D,
					null,
					g.createElement(
						R,
						{
							key: "grid",
							active: n,
							disabled: t,
							title: "Apply a grid to the preview",
							onClick: () => c({ value: s, grid: !n }),
						},
						g.createElement(z, null)
					),
					a > 0
						? g.createElement(
								H,
								{
									key: "background",
									placement: "top",
									closeOnOutsideClick: !0,
									tooltip: ({ onHide: u }) =>
										g.createElement(F, {
											links: [
												...(o
													? [
															{
																id: "reset",
																title: "Reset background",
																icon: g.createElement(X, null),
																onClick: () => {
																	c({ value: void 0, grid: n }), u()
																},
															},
														]
													: []),
												...Object.entries(d).map(([l, S]) => ({
													id: l,
													title: S.name,
													icon: g.createElement(W, { color: S?.value || "grey" }),
													active: l === s,
													onClick: () => {
														c({ value: l, grid: n }), u()
													},
												})),
											].flat(),
										}),
									onVisibleChange: i,
								},
								g.createElement(
									R,
									{
										disabled: t,
										key: "background",
										title: "Change the background of the preview",
										active: !!o || I,
									},
									g.createElement(Y, null)
								)
							)
						: null
				)
			}),
			he = ee.span(
				({ background: e }) => ({
					borderRadius: "1rem",
					display: "block",
					height: "1rem",
					width: "1rem",
					background: e,
				}),
				({ theme: e }) => ({ boxShadow: `${e.appBorderColor} 0 0 0 1px inset` })
			),
			fe = (e, o = [], a) => {
				if (e === "transparent") return "transparent"
				if (o.find((i) => i.value === e) || e) return e
				const r = o.find((i) => i.name === a)
				if (r) return r.value
				if (a) {
					const i = o.map((d) => d.name).join(", ")
					K.warn(oe`
        Backgrounds Addon: could not find the default color "${a}".
        These are the available colors for your story based on your configuration:
        ${i}.
      `)
				}
				return "transparent"
			},
			te = (0, V.default)(1e3)((e, o, a, r, i, d) => ({
				id: e || o,
				title: o,
				onClick: () => {
					i({ selected: a, name: o })
				},
				value: a,
				right: r ? g.createElement(he, { background: a }) : void 0,
				active: d,
			})),
			ge = (0, V.default)(10)((e, o, a) => {
				const r = e.map(({ name: i, value: d }) => te(null, i, d, !0, a, d === o))
				return o !== "transparent"
					? [te("reset", "Clear background", "transparent", null, a, !1), ...r]
					: r
			}),
			be = { default: null, disable: !0, values: [] },
			Se = w(() => {
				const e = P(y, be),
					[o, a] = G(!1),
					[r, i] = x(),
					d = r[y]?.value,
					s = J(() => fe(d, e.values, e.default), [e, d])
				Array.isArray(e) &&
					K.warn(
						"Addon Backgrounds api has changed in Storybook 6.0. Please refer to the migration guide: https://github.com/storybookjs/storybook/blob/next/MIGRATION.md"
					)
				const t = U(
					(n) => {
						i({ [y]: { ...r[y], value: n } })
					},
					[e, r, i]
				)
				return e.disable
					? null
					: g.createElement(
							H,
							{
								placement: "top",
								closeOnOutsideClick: !0,
								tooltip: ({ onHide: n }) =>
									g.createElement(F, {
										links: ge(e.values, s, ({ selected: I }) => {
											s !== I && t(I), n()
										}),
									}),
								onVisibleChange: a,
							},
							g.createElement(
								R,
								{
									key: "background",
									title: "Change the background of the preview",
									active: s !== "transparent" || o,
								},
								g.createElement(Y, null)
							)
						)
			}),
			Ce = w(() => {
				const [e, o] = x(),
					{ grid: a } = P(y, { grid: { disable: !1 } })
				if (a?.disable) return null
				const r = e[y]?.grid || !1
				return g.createElement(
					R,
					{
						key: "background",
						active: r,
						title: "Apply a grid to the preview",
						onClick: () => o({ [y]: { ...e[y], grid: !r } }),
					},
					g.createElement(z, null)
				)
			})
		N.register(ne, () => {
			N.add(ne, {
				title: "Backgrounds",
				type: Z.TOOL,
				match: ({ viewMode: e, tabId: o }) => !!(e && e.match(/^(story|docs)$/)) && !o,
				render: () =>
					FEATURES?.backgroundsStoryGlobals
						? g.createElement(pe, null)
						: g.createElement(D, null, g.createElement(Se, null), g.createElement(Ce, null)),
			})
		})
	})()
} catch (e) {
	console.error("[Storybook] One of your manager-entries failed: " + import.meta.url, e)
}
