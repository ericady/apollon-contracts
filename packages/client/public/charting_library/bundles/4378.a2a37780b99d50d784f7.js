(self.webpackChunktradingview = self.webpackChunktradingview || []).push([
  [4378],
  {
    45015: (e) => {
      e.exports = { 'link-item': 'link-item-eIA09f0e' };
    },
    85200: (e) => {
      e.exports = {
        'arrow-icon': 'arrow-icon-NIrWNOPk',
        dropped: 'dropped-NIrWNOPk',
        'size-xsmall': 'size-xsmall-NIrWNOPk',
        'size-small': 'size-small-NIrWNOPk',
        'size-medium': 'size-medium-NIrWNOPk',
        'size-large': 'size-large-NIrWNOPk',
        'size-xlarge': 'size-xlarge-NIrWNOPk',
      };
    },
    25164: (e) => {
      e.exports = {
        'underline-tab': 'underline-tab-cfYYXvwA',
        'disable-focus-outline': 'disable-focus-outline-cfYYXvwA',
        'enable-cursor-pointer': 'enable-cursor-pointer-cfYYXvwA',
        selected: 'selected-cfYYXvwA',
        'disable-active-state-styles': 'disable-active-state-styles-cfYYXvwA',
        'size-xsmall': 'size-xsmall-cfYYXvwA',
        'size-small': 'size-small-cfYYXvwA',
        'size-medium': 'size-medium-cfYYXvwA',
        'size-large': 'size-large-cfYYXvwA',
        'size-xlarge': 'size-xlarge-cfYYXvwA',
        fake: 'fake-cfYYXvwA',
      };
    },
    79877: (e) => {
      e.exports = {
        'scroll-wrap': 'scroll-wrap-SmxgjhBJ',
        'size-xlarge': 'size-xlarge-SmxgjhBJ',
        'enable-scroll': 'enable-scroll-SmxgjhBJ',
        'underline-tabs': 'underline-tabs-SmxgjhBJ',
        'size-large': 'size-large-SmxgjhBJ',
        'size-medium': 'size-medium-SmxgjhBJ',
        'size-small': 'size-small-SmxgjhBJ',
        'size-xsmall': 'size-xsmall-SmxgjhBJ',
        'stretch-tabs': 'stretch-tabs-SmxgjhBJ',
        'stretch-tab-item': 'stretch-tab-item-SmxgjhBJ',
      };
    },
    56073: (e, t, n) => {
      'use strict';
      function i(e, t = !1) {
        const n = getComputedStyle(e),
          i = [n.height];
        return (
          'border-box' !== n.boxSizing && i.push(n.paddingTop, n.paddingBottom, n.borderTopWidth, n.borderBottomWidth),
          t && i.push(n.marginTop, n.marginBottom),
          i.reduce((e, t) => e + (parseFloat(t) || 0), 0)
        );
      }
      function a(e, t = !1) {
        const n = getComputedStyle(e),
          i = [n.width];
        return (
          'border-box' !== n.boxSizing && i.push(n.paddingLeft, n.paddingRight, n.borderLeftWidth, n.borderRightWidth),
          t && i.push(n.marginLeft, n.marginRight),
          i.reduce((e, t) => e + (parseFloat(t) || 0), 0)
        );
      }
      n.d(t, { outerHeight: () => i, outerWidth: () => a });
    },
    64378: (e, t, n) => {
      'use strict';
      n.d(t, { UnderlineButtonTabs: () => se });
      var i,
        a = n(50959),
        s = n(97754),
        l = n.n(s),
        r = n(44352);
      !(function (e) {
        (e.StartFirst = 'start-first'), (e.EndFirst = 'end-first');
      })(i || (i = {}));
      var o = n(67842),
        c = n(56073),
        u = n(78869),
        d = n(43010),
        m = n(53017);
      function b(e) {
        const {
            itemsList: t,
            getItemId: n,
            calcVisibleAndHiddenItems: i,
            shouldKeepItemVisible: s,
            onMeasureCallback: l,
            forceUpdate: r = !1,
          } = e,
          [b, h] = (0, u.useRefsMap)(),
          v = (0, a.useRef)(null),
          g = (0, a.useRef)({ widthsMap: new Map(), containerWidth: 0, moreButtonWidth: 0 }),
          [p, C] = (0, a.useState)({ visible: t, hidden: [] }),
          k = (0, a.useMemo)(() => t.reduce((e, t, n) => (s(t) && e.push(n), e), []), [t, s]),
          w = (0, a.useCallback)(() => {
            const e = i(g.current, k);
            (function (e, t) {
              return !f(e.visible, t.visible) || !f(e.hidden, t.hidden);
            })(p, e) && C(e);
          }, [g, C, p, k, i]),
          x = (0, a.useCallback)(() => {
            g.current.moreButtonWidth = v.current ? (0, c.outerWidth)(v.current, !0) : 0;
            const e = new Map(g.current.widthsMap);
            for (const i of t) {
              const t = n(i),
                a = b.current.get(t);
              if (a) {
                const n = (0, c.outerWidth)(a, !0);
                e.set(t, n);
              }
            }
            (g.current.widthsMap = e), l && l();
          }, [g, t, n, b, l]),
          y = (0, a.useRef)(null),
          A = (0, a.useCallback)(
            ([e]) => {
              e.contentRect.width !== g.current.containerWidth &&
                (y.current && cancelAnimationFrame(y.current),
                (g.current.containerWidth = e.contentRect.width),
                (y.current = requestAnimationFrame(() => {
                  w();
                })));
            },
            [g, w],
          ),
          I = (0, a.useRef)(null),
          R = (0, a.useCallback)(
            ([e]) => {
              I.current && cancelAnimationFrame(I.current),
                x(),
                (I.current = requestAnimationFrame(() => {
                  w();
                }));
            },
            [x, w],
          ),
          z = (0, o.useResizeObserver)(R),
          B = (0, o.useResizeObserver)(A),
          S = (0, a.useRef)(null),
          N = (0, m.mergeRefs)([B, S]),
          E = (0, a.useRef)(t),
          W = (0, a.useRef)(!0),
          H = (0, a.useRef)([]);
        return (
          (0, d.useIsomorphicLayoutEffect)(() => {
            (!r && !W.current && f(E.current, t) && f(k, H.current)) ||
              (w(), (W.current = !1), (E.current = t), (H.current = k));
          }, [t, w, k, r]),
          {
            containerRefCallback: N,
            moreButtonRef: v,
            innerContainerRefCallback: z,
            itemsRefs: b,
            setItemRef: h,
            hiddenItems: p.hidden,
            visibleItems: p.visible,
            itemsMeasurements: g,
          }
        );
      }
      function f(e, t) {
        return e.length === t.length && e.reduce((e, n, i) => e && n === t[i], !0);
      }
      function h(e, t, n, s = i.EndFirst) {
        const l = (0, a.useCallback)(
          (n, a) => {
            const l = e.map((e) => {
              var i;
              return null !== (i = n.widthsMap.get(t(e))) && void 0 !== i ? i : 0;
            });
            return (function ({
              items: e,
              containerWidth: t,
              elementsWidths: n,
              menuItemWidth: a,
              keepVisible: s,
              direction: l,
            }) {
              const r = [...e],
                o = [],
                c = [];
              let u = 0;
              for (const e of n) u += e;
              if (u <= t) return { visible: r, hidden: c };
              const d = [...n];
              if (((u = s.map((e) => d[e]).reduce((e, t) => e + t, 0) + a), l === i.EndFirst))
                for (let e = 0; e < r.length; e++)
                  s.includes(e) ? o.push(r[e]) : ((u += d[e]), u <= t ? o.push(r[e]) : c.push(r[e]));
              else
                for (let e = r.length - 1; e >= 0; e--)
                  s.includes(e) ? o.unshift(r[e]) : ((u += d[e]), u <= t ? o.unshift(r[e]) : c.unshift(r[e]));
              return { visible: o, hidden: c };
            })({
              items: e,
              containerWidth: n.containerWidth,
              elementsWidths: l,
              menuItemWidth: n.moreButtonWidth,
              keepVisible: a,
              direction: s,
            });
          },
          [e],
        );
        return b({ itemsList: e, getItemId: t, calcVisibleAndHiddenItems: l, shouldKeepItemVisible: n });
      }
      var v,
        g = n(38528),
        p = n(47201),
        C = n(7953),
        k = n(22064);
      function w(e, t, n, i, a) {
        return {
          id: e,
          role: 'tablist',
          'aria-orientation': t,
          'aria-label': a,
          'aria-labelledby': i,
          'aria-disabled': n,
        };
      }
      function x(e, t, n, i, a) {
        return {
          id: e,
          role: 'tab',
          tabIndex: t ? 0 : -1,
          disabled: a,
          'aria-selected': n,
          'aria-controls': i,
          'aria-disabled': a,
        };
      }
      !(function (e) {
        (e.SquareButtonTabs = 'square-button-tabs'),
          (e.UnderlineButtonTabs = 'underline-button-tabs'),
          (e.UnderlineAnchorTabs = 'underline-anchor-tabs'),
          (e.RoundAnchorTabs = 'round-anchor-tabs'),
          (e.RoundButtonTabs = 'round-button-tabs'),
          (e.LightButtonTabs = 'light-button-tabs');
      })(v || (v = {}));
      var y = n(29202),
        A = n(16921),
        I = n(50151),
        R = n(66686),
        z = n(36762);
      function B() {
        return !1;
      }
      function S(e) {
        const { activationType: t = 'manual' } = e,
          n = (0, a.useMemo)(() => t, []);
        return (
          (0, I.assert)(t === n, 'Activation type must be invariant.'),
          'automatic' === t
            ? (function (e) {
                const {
                    isRtl: t,
                    items: n,
                    preventDefaultIfHandled: i = !0,
                    isHighlighted: s,
                    onHighlight: l,
                    onActivate: r,
                    isCollapsed: o = B,
                  } = e,
                  c = (0, a.useCallback)(
                    (e) => {
                      l(e), o(e) || r(e);
                    },
                    [l, r, o],
                  );
                return (0, R.useKeyboardEventHandler)([(0, z.useItemsKeyboardNavigation)(t, n, s, c, !0)], i);
              })(e)
            : (function (e) {
                const {
                    isRtl: t,
                    items: n,
                    preventDefaultIfHandled: i = !0,
                    isHighlighted: s,
                    onHighlight: l,
                    onActivate: r,
                  } = e,
                  o = n.find(s),
                  c = (0, a.useCallback)(() => {
                    void 0 !== o && r(o);
                  }, [o, r]),
                  u = (0, a.useCallback)((e) => l(e), [l]),
                  d = (0, z.useItemsKeyboardNavigation)(t, n, s, u, !0),
                  m = (0, R.useKeyboardActionHandler)([13, 32], c);
                return (0, R.useKeyboardEventHandler)([d, m], i);
              })(e)
        );
      }
      var N = n(5325);
      function E(e) {
        const {
            id: t,
            items: n,
            orientation: i = 'horizontal',
            activationType: s = 'manual',
            disabled: l,
            tablistLabelId: r,
            tablistLabel: o,
            focusOnHighlight: c = !0,
            preventDefaultIfKeyboardActionHandled: u = !0,
            scrollIntoViewOptions: d,
            isActive: m,
            onActivate: b,
            isCollapsed: f,
            isRtl: h,
          } = e,
          v = (function () {
            const [e, t] = (0, a.useState)(!1);
            return (
              (0, a.useEffect)(() => {
                t(N.mobiletouch);
              }, []),
              e
            );
          })(),
          g = (0, a.useRef)(new Map()),
          [C, I] = (0, a.useState)(),
          [R, z] = (0, y.useFocus)(),
          B = n.find(m),
          E = (0, a.useCallback)((e) => !l && !e.disabled && e === C, [l, C]),
          W = (0, a.useCallback)(
            (e) => {
              const t = g.current.get(e);
              c && void 0 !== t && t !== document.activeElement && t.focus();
            },
            [c, g],
          ),
          H = (0, a.useRef)(),
          O = (0, a.useCallback)(
            (e, t) => {
              l ||
                e.disabled ||
                (I(e),
                'number' == typeof t ? (clearTimeout(H.current), (H.current = setTimeout(() => W(e), t))) : W(e));
            },
            [l, E, I, W],
          ),
          T = (0, a.useCallback)(
            (e) => {
              l || e.disabled || (b(e), E(e) || O(e));
            },
            [l, m, b, E, O],
          ),
          F = S({
            isRtl: h,
            items: (0, a.useMemo)(() => n.filter((e) => !l && !e.disabled), [n, l]),
            activationType: s,
            preventDefaultIfHandled: u,
            onActivate: T,
            isHighlighted: E,
            onHighlight: O,
            isCollapsed: f,
          }),
          M = (0, a.useCallback)(
            (e) => {
              let t = null;
              for (const [n, i] of g.current.entries())
                if (e.target === i) {
                  t = n;
                  break;
                }
              t && !E(t) && ('automatic' === s && f && !f(t) ? T(t) : O(t));
            },
            [s, g, E, O, T, f],
          );
        (0, a.useEffect)(() => {
          v || (void 0 !== B && I(B));
        }, [B, v]),
          (0, a.useEffect)(() => {
            R || I(void 0);
          }, [R]),
          (0, a.useEffect)(() => () => clearTimeout(H.current), []);
        const [Y, L] = (0, A.useKeepActiveItemIntoView)({
            ...d,
            activeItem: null != C ? C : B,
            getKey: (0, a.useCallback)((e) => e.id, []),
          }),
          K = (0, a.useCallback)(
            (e, t) => {
              L(e, t), null !== t ? g.current.set(e, t) : g.current.delete(e);
            },
            [L, g],
          );
        var D;
        return {
          tabsBindings: n.map((e) => {
            var t, n;
            const i = E(e),
              a = m(e),
              s = null !== (n = null !== (t = e.disabled) && void 0 !== t ? t : l) && void 0 !== n && n,
              r = !s && (R ? i : a);
            return { ...x(e.id, r, a, e.tabpanelId, s), highlighted: i, active: a, handleItemRef: K };
          }),
          tablistBinding: {
            ...w(((D = t), (0, k.createDomId)(D, 'tablist')), i, l, r, o),
            onBlur: z.onBlur,
            onFocus: (0, p.createSafeMulticastEventHandler)(z.onFocus, M),
            onKeyDown: F,
          },
          scrollWrapBinding: { ref: Y },
          onActivate: T,
          onHighlight: O,
          isHighlighted: E,
        };
      }
      var W = n(26597);
      const H = (0, a.createContext)('small');
      var O = n(17946),
        T = n(25164);
      function F(e) {
        const {
          size: t = 'xsmall',
          active: n,
          fake: i,
          enableActiveStateStyles: a,
          anchor: l = !1,
          hideFocusOutline: r = !1,
          className: o,
        } = e;
        return s(
          T['underline-tab'],
          T[`size-${t}`],
          n && T.selected,
          !a && T['disable-active-state-styles'],
          r && T['disable-focus-outline'],
          i && T.fake,
          l && T['enable-cursor-pointer'],
          o,
        );
      }
      const M = (0, a.forwardRef)((e, t) => {
        const n = (0, a.useContext)(H),
          i = (0, a.useContext)(O.CustomBehaviourContext),
          {
            active: s,
            fake: l,
            className: r,
            enableActiveStateStyles: o = i.enableActiveStateStyles,
            hideFocusOutline: c = !1,
            ...u
          } = e;
        return a.createElement('button', {
          ...u,
          ref: t,
          className: F({ size: n, active: s, fake: l, enableActiveStateStyles: o, hideFocusOutline: c, className: r }),
        });
      });
      M.displayName = 'UnderlineTabsBaseButton';
      const Y = (0, a.forwardRef)((e, t) => {
        const { item: n, highlighted: i, handleItemRef: s, onClick: l, 'aria-disabled': r, ...o } = e,
          c = (0, a.useCallback)(() => {
            l && l(n);
          }, [l, n]),
          u = (0, a.useCallback)(
            (e) => {
              s && s(n, e), t && 'object' == typeof t ? (t.current = e) : 'function' == typeof t && t(e);
            },
            [n, s, t],
          );
        return a.createElement(M, { ...o, id: n.id, onClick: c, ref: u }, n.label);
      });
      Y.displayName = 'UnderlineButtonTab';
      var L = n(16396),
        K = n(4523),
        D = n(9745),
        P = n(47531),
        j = n(2948),
        X = n(63509),
        J = n(68874),
        V = n(85200);
      function U(e) {
        switch (e) {
          case 'xsmall':
            return P;
          case 'small':
            return j;
          case 'medium':
          case 'large':
            return X;
          case 'xlarge':
            return J;
        }
      }
      function q(e) {
        const { size: t, isDropped: n = !1 } = e;
        return a.createElement(D.Icon, { icon: U(t), className: s(V['arrow-icon'], V[`size-${t}`], n && V.dropped) });
      }
      var $ = n(45015);
      function Z(e) {
        const {
            size: t,
            disabled: n,
            isOpened: i,
            enableActiveStateStyles: s,
            hideFocusOutline: l,
            fake: r,
            items: o,
            buttonContent: c,
            buttonRef: u,
            isAnchorTabs: d,
            isHighlighted: m,
            onButtonClick: b,
            onItemClick: f,
            onClose: h,
          } = e,
          v = (0, a.useRef)(null),
          p = (0, g.useMergedRefs)([u, v]),
          C = (function (e, t) {
            const n = (0, a.useRef)(Q);
            return (
              (0, a.useEffect)(() => {
                const e = getComputedStyle((0, I.ensureNotNull)(t.current));
                n.current = {
                  xsmall: G(e, 'xsmall'),
                  small: G(e, 'small'),
                  medium: G(e, 'medium'),
                  large: G(e, 'large'),
                  xlarge: G(e, 'xlarge'),
                };
              }, [t]),
              (0, a.useCallback)(() => {
                const i = (0, I.ensureNotNull)(t.current).getBoundingClientRect(),
                  a = n.current[e];
                return {
                  x: i.left,
                  y: i.top + i.height + a + 4,
                  indentFromWindow: { top: 4, bottom: 4, left: 4, right: 4 },
                };
              }, [t, e])
            );
          })(t, v);
        return a.createElement(K.PopupMenuDisclosureView, {
          buttonRef: v,
          listboxTabIndex: -1,
          isOpened: i,
          onClose: h,
          listboxAria: { 'aria-hidden': !0 },
          popupPosition: C,
          button: a.createElement(
            M,
            {
              'aria-hidden': !0,
              disabled: n,
              active: i,
              onClick: b,
              ref: p,
              tabIndex: -1,
              enableActiveStateStyles: s,
              hideFocusOutline: l,
              fake: r,
            },
            c,
            a.createElement(q, { size: t, isDropped: i }),
          ),
          popupChildren: o.map((e) =>
            a.createElement(L.PopupMenuItem, {
              key: e.id,
              className: d ? $['link-item'] : void 0,
              onClick: f,
              onClickArg: e,
              isActive: m(e),
              label: e.label,
              isDisabled: e.disabled,
              link: 'href' in e ? e.href : void 0,
              rel: 'rel' in e ? e.rel : void 0,
              target: 'target' in e ? e.target : void 0,
              renderComponent: 'renderComponent' in e ? e.renderComponent : void 0,
              dontClosePopup: !0,
            }),
          ),
        });
      }
      function G(e, t) {
        return parseInt(e.getPropertyValue(`--ui-lib-underline-tabs-tab-margin-bottom-${t}`), 10);
      }
      const Q = { xsmall: 0, small: 0, medium: 0, large: 0, xlarge: 0 };
      function _(e, t = !1) {
        const [n, i] = (0, a.useState)(t);
        return (
          (0, a.useEffect)(() => {
            const t = window.matchMedia(e);
            function n() {
              i(t.matches);
            }
            return (
              n(),
              t.addListener(n),
              () => {
                t.removeListener(n);
              }
            );
          }, [e]),
          n
        );
      }
      var ee = n(86240),
        te = n(79877);
      function ne(e) {
        const { size: t, overflowBehaviour: n, className: i } = e;
        return s(te['scroll-wrap'], te[`size-${t}`], 'scroll' === n && te['enable-scroll'], i);
      }
      function ie() {
        const [e, t] = (0, a.useState)(!1);
        return (
          (0, a.useEffect)(() => {
            t(N.mobiletouch);
          }, []),
          e
        );
      }
      var ae = n(38223);
      function se(e) {
        const {
            id: t,
            items: i,
            activationType: s,
            orientation: o,
            disabled: c,
            moreButtonContent: u = r.t(null, void 0, n(41610)),
            size: d = 'small',
            onActivate: m,
            isActive: b,
            className: f,
            style: v,
            overflowBehaviour: k,
            enableActiveStateStyles: w,
            tablistLabelId: x,
            tablistLabel: y,
            'data-name': A = 'underline-tabs-buttons',
            stretchTabs: I,
          } = e,
          R = ie(),
          z = (function (e) {
            const t = _(ee['media-mf-phone-landscape'], !0),
              n = ie();
            return null != e ? e : n || !t ? 'scroll' : 'collapse';
          })(k),
          B = (0, a.useRef)(!1),
          S = (0, a.useCallback)((e) => e.id, []),
          N = 'none' === z && I,
          O = null != w ? w : !R,
          {
            visibleItems: T,
            hiddenItems: F,
            containerRefCallback: M,
            innerContainerRefCallback: L,
            moreButtonRef: K,
            setItemRef: D,
          } = h(i, S, b),
          P = 'collapse' === z ? T : i,
          j = 'collapse' === z ? F : [],
          X = (0, a.useCallback)((e) => j.includes(e), [j]),
          {
            tabsBindings: J,
            tablistBinding: V,
            scrollWrapBinding: U,
            onActivate: q,
            onHighlight: $,
            isHighlighted: G,
          } = E({
            id: t,
            items: [...P, ...j],
            activationType: s,
            orientation: o,
            disabled: c,
            tablistLabelId: x,
            tablistLabel: y,
            onActivate: m,
            isActive: b,
            isCollapsed: X,
            isRtl: ae.isRtl,
          }),
          Q = j.find(G),
          se = (0, a.useCallback)(() => {
            const e = i.find(b);
            e && $(e);
          }, [$, b, i]),
          le = (0, a.useCallback)(
            (e) => {
              var t;
              return null !== (t = J.find((t) => t.id === e.id)) && void 0 !== t ? t : {};
            },
            [i, J],
          ),
          { isOpened: re, open: oe, close: ce, onButtonClick: ue } = (0, C.useDisclosure)({ id: t, disabled: c }),
          de = (0, a.useCallback)(() => {
            ce(), se(), (B.current = !0);
          }, [ce, se]),
          me = (0, a.useCallback)(() => {
            Q && (q(Q), $(Q, 200));
          }, [q, $, Q]);
        (U.ref = (0, g.useMergedRefs)([U.ref, M])),
          (V.ref = (0, g.useMergedRefs)([V.ref, L])),
          (V.onKeyDown = (0, p.createSafeMulticastEventHandler)(
            (0, W.useKeyboardEventHandler)([
              (0, W.useKeyboardClose)(re, de),
              (0, W.useKeyboardActionHandler)(
                [13, 32],
                me,
                (0, a.useCallback)(() => Boolean(Q), [Q]),
              ),
            ]),
            V.onKeyDown,
          ));
        const be = (0, a.useCallback)(
            (e) => {
              (B.current = !0), ue(e);
            },
            [B, ue],
          ),
          fe = (0, a.useCallback)(
            (e) => {
              e && q(e);
            },
            [q],
          );
        return (
          (0, a.useEffect)(() => {
            B.current ? (B.current = !1) : (Q && !re && oe(), !Q && re && ce());
          }, [Q, re, oe, ce]),
          a.createElement(
            H.Provider,
            { value: d },
            a.createElement(
              'div',
              { ...U, className: ne({ size: d, overflowBehaviour: z, className: f }), style: v, 'data-name': A },
              a.createElement(
                'div',
                { ...V, className: l()(te['underline-tabs'], N && te['stretch-tabs']) },
                P.map((e) =>
                  a.createElement(Y, {
                    ...le(e),
                    className: l()(N && te['stretch-tab-item']),
                    key: e.id,
                    item: e,
                    onClick: () => q(e),
                    enableActiveStateStyles: O,
                    hideFocusOutline: R,
                    ref: D(S(e)),
                    ...(e.dataId && { 'data-id': e.dataId }),
                  }),
                ),
                j.map((e) => a.createElement(Y, { ...le(e), key: e.id, item: e, fake: !0 })),
                a.createElement(Z, {
                  size: d,
                  disabled: c,
                  isOpened: re,
                  items: j,
                  buttonContent: u,
                  buttonRef: K,
                  isHighlighted: G,
                  onButtonClick: be,
                  onItemClick: fe,
                  onClose: ce,
                  enableActiveStateStyles: O,
                  hideFocusOutline: R,
                  fake: 0 === j.length,
                }),
              ),
            ),
          )
        );
      }
      var le = n(38952);
      function re(e) {
        return a.createElement('a', { ...(0, le.renameRef)(e) });
      }
      (0, a.forwardRef)((e, t) => {
        var n;
        const i = (0, a.useContext)(H),
          s = (0, a.useContext)(O.CustomBehaviourContext),
          {
            item: l,
            highlighted: r,
            handleItemRef: o,
            onClick: c,
            active: u,
            fake: d,
            className: m,
            enableActiveStateStyles: b = s.enableActiveStateStyles,
            hideFocusOutline: f = !1,
            disabled: h,
            'aria-disabled': v,
            ...g
          } = e,
          p = (0, a.useCallback)(
            (e) => {
              v ? e.preventDefault() : c && c(l);
            },
            [c, v, l],
          ),
          C = (0, a.useCallback)(
            (e) => {
              o && o(l, e), t && 'object' == typeof t ? (t.current = e) : 'function' == typeof t && t(e);
            },
            [l, o, t],
          ),
          k = null !== (n = l.renderComponent) && void 0 !== n ? n : re;
        return a.createElement(
          k,
          {
            ...g,
            id: l.id,
            'aria-disabled': v,
            onClick: p,
            reference: C,
            href: l.href,
            rel: l.rel,
            target: l.target,
            className: F({
              size: i,
              active: u,
              fake: d,
              enableActiveStateStyles: b,
              anchor: !0,
              hideFocusOutline: f,
              className: m,
            }),
          },
          l.label,
        );
      }).displayName = 'UnderlineAnchorTab';
    },
    47531: (e) => {
      e.exports =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18"><path fill="currentColor" d="m4.67 7.38.66-.76L9 9.84l3.67-3.22.66.76L9 11.16 4.67 7.38Z"/></svg>';
    },
    63509: (e) => {
      e.exports =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18" width="18" height="18"><path fill="currentColor" d="M8.38 11.78a1 1 0 0 0 1.24 0l5-4a1 1 0 1 0-1.24-1.56L9 9.72l-4.38-3.5a1 1 0 1 0-1.24 1.56l5 4Z"/></svg>';
    },
    68874: (e) => {
      e.exports =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" width="28" height="28"><path fill="currentColor" d="M7.3 10.3a1 1 0 0 1 1.4 0l5.3 5.29 5.3-5.3a1 1 0 1 1 1.4 1.42l-6 6a1 1 0 0 1-1.4 0l-6-6a1 1 0 0 1 0-1.42Z"/></svg>';
    },
  },
]);
