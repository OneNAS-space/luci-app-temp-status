'use strict';
'require baseclass';
'require rpc';

document.head.append(E('style', {'type': 'text/css'},
`
:root {
	--app-temp-status-font-color: #2e2e2e;
	--app-temp-status-border-color: var(--border-color-medium, #d4d4d4);
	--app-temp-status-hot-color: #fff7e2;
	--app-temp-status-overheat-color: #ffe9e8;
}
:root[data-darkmode="true"] {
	--app-temp-status-font-color: #fff;
	--app-temp-status-border-color: var(--border-color-medium, #444);
	--app-temp-status-hot-color: #8d7000;
	--app-temp-status-overheat-color: #a93734;
}
:root {
	/* light: same colors as the zone strips of the Port status cards (Argon variables, with fallbacks) */
	--app-temp-status-ok: rgb(var(--zone-positive-rgb, 144, 240, 144));
	--app-temp-status-warn: rgb(240, 208, 144);
	--app-temp-status-crit: rgb(var(--zone-negative-rgb, 240, 144, 144));
	--app-temp-status-crit-text: var(--zone-label-color, #333);
}
/* dark: Argon's zone colors are too dim for a thermometer / gauge, use brighter tones */
:root[data-argon-mode="dark"] {
	--app-temp-status-ok: rgb(88, 168, 88);
	--app-temp-status-warn: rgb(235, 184, 64);
	--app-temp-status-crit: rgb(232, 106, 106);
	--app-temp-status-crit-text: #fff;
}
@media (prefers-color-scheme: dark) {
	:root:not([data-argon-mode="light"]) {
		--app-temp-status-ok: rgb(88, 168, 88);
		--app-temp-status-warn: rgb(235, 184, 64);
		--app-temp-status-crit: rgb(232, 106, 106);
		--app-temp-status-crit-text: #fff;
	}
}
.temp-status-hot {
	background-color: var(--app-temp-status-hot-color) !important;
	color: var(--app-temp-status-font-color) !important;
}
.temp-status-hot .td {
	color: var(--app-temp-status-font-color) !important;
}
.temp-status-hot td {
	color: var(--app-temp-status-font-color) !important;
}
.temp-status-overheat {
	background-color: var(--app-temp-status-overheat-color) !important;
	color: var(--app-temp-status-font-color) !important;
}
.temp-status-overheat .td {
	color: var(--app-temp-status-font-color) !important;
}
.temp-status-overheat td {
	color: var(--app-temp-status-font-color) !important;
}

.temp-status-temp-area {
	width: 100%;
	padding: 0 0 1em 0;
	display: flex;
	-webkit-align-items: flex-start;
	align-items: flex-start;
	-webkit-justify-content: left;
	justify-content: left;
	-webkit-flex-wrap: wrap;
	flex-wrap: wrap;
	-webkit-flex-direction: row;
	flex-direction: row;
}
.temp-status-list-item {
	display: inline-block;
	flex-grow: 0;
	-webkit-flex-grow 0;
	flex-shrink: 1;
	-webkit-flex-shrink 1;
	width: 29em;
	word-wrap: break-word;
	margin: 0px 4px 4px 0 !important;
	padding: 4px;
	border: 1px solid transparent;
	border-color: var(--app-temp-status-border-color);
	-webkit-border-radius: 4px;
	-moz-border-radius: 4px;
	border-radius: 4px;
}
.temp-status-temp-value {
	display: inline-block;
	margin-left: 0.5em !important;
	width: 4em;
	text-align: left;
}
.temp-status-sensor-name {
	display: inline-block;
	padding-left: 1.5em;
	font-size: 95%;
}

/* card view: same structure as the Port status cards (.ifacebox) */
/* every row is spread over the full width, a short last row ends up centered */
.temp-status-card-area {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-evenly;
	gap: var(--field-gap, .75rem);
	padding: .25rem var(--section-inset, .25em) var(--field-gap, .5rem);
}

.temp-status-card.ifacebox {
	display: flex;
	flex: 0 0 5.625rem;
	flex-direction: column;
	width: 5.625rem;
	min-width: 0;
	max-width: 100%;
	margin: 0;
	overflow: hidden;
	text-align: center;
}

.temp-status-card .temp-status-card-head {
	position: relative;
	padding: .2em 1.15em .2em .5em;
	font-size: .75rem;
	line-height: 1.25;
}
/* one line only, so the values of cards in the same row stay aligned; full name is in the tooltip.
   The ellipsis lives on an inner element that ignores the pointer: Safari shows a native tooltip
   for any hovered element that is cut off with an ellipsis, on top of LuCI's own tooltip. */
.temp-status-card .temp-status-card-name {
	display: block;
	font-weight: bold;
}
.temp-status-card .temp-status-card-name-text {
	display: block;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
	pointer-events: none;
}
/* same pointer as LuCI's own tooltip targets */
.temp-status-card [data-tooltip] {
	cursor: help;
}

.temp-status-card .temp-status-hide-item {
	position: absolute;
	top: 50%;
	right: .25em;
	transform: translateY(-50%);
	margin: 0 !important;
	padding: 0 .3em;
	border: 0;
	background: none;
	font-size: 1.1em;
	font-weight: normal;
	line-height: 1;
	opacity: .45;
}
.temp-status-card .temp-status-hide-item:hover {
	opacity: 1;
	color: var(--app-temp-status-crit);
}

.temp-status-card .temp-status-card-main {
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: .25rem;
	padding: .4rem .375rem;
	line-height: 1;
}
.temp-status-card-value {
	font-size: 11px;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

/* thermometer icon, plays the role of the port icon in the Port status cards */
.temp-status-icon {
	display: block;
	width: 12px;
	height: 24px;
}
.temp-status-icon .tube {
	fill: none;
	stroke: currentColor;
	stroke-width: 1.5;
	opacity: .5;
}
.temp-status-icon .mercury {
	fill: var(--temp-color, var(--app-temp-status-ok));
}
.temp-status-card-nodata .temp-status-icon .mercury {
	fill: currentColor;
	opacity: .25;
}

/* 3px gauge strip, like the zone strip between the two halves of a port card */
.temp-status-gauge {
	flex: none;
	height: 3px;
	background: var(--iface-head-bg, rgba(128, 128, 128, .25));
}
.temp-status-gauge::before {
	content: '';
	display: block;
	height: 100%;
	width: var(--temp-ratio, 0%);
	background: var(--temp-color, var(--app-temp-status-ok));
	transition: width .6s ease;
}

.temp-status-card .temp-status-card-info {
	display: flex;
	flex-wrap: nowrap;
	align-items: center;
	justify-content: space-between;
	gap: .25rem;
	padding: .3rem;
	font-size: 80%;
	line-height: 1.3;
	white-space: nowrap;
}
.temp-status-info-label {
	font-size: 80%;
	text-transform: uppercase;
	opacity: .7;
}
.temp-status-info-value {
	margin-inline-start: auto;
	font-variant-numeric: tabular-nums;
}

.temp-status-card-hot { --temp-color: var(--app-temp-status-warn); }
.temp-status-card-overheat { --temp-color: var(--app-temp-status-crit); }
.temp-status-card-hot .temp-status-card-value,
.temp-status-card-overheat .temp-status-card-value {
	color: var(--temp-color);
	color: color-mix(in srgb, var(--temp-color) 55%, var(--iface-head-text, #000));
}
.temp-status-card-overheat .temp-status-card-head {
	background: var(--app-temp-status-crit);
	color: var(--app-temp-status-crit-text);
}
.temp-status-card-overheat .temp-status-hide-item:hover { color: inherit; }

#temp-status-buttons-wrapper {
	/* the label text, not the faint button box, lines up with the section title: pull the box out by its border + padding */
	margin: 0 0 0 -11px;
	padding: .25rem var(--section-inset, 0) 0;
}
.temp-status-button {
	display: inline-block;
	cursor: pointer;
	margin: 2px 4px 2px 0 !important;
	padding: 3px 10px;
	border: 1px solid transparent;
	-webkit-border-radius: 4px;
	-moz-border-radius: 4px;
	border-radius: 4px;
	opacity: 1;
	background-color: rgba(100 100 100 / 0.05);
}
.temp-status-button:hover {
	opacity: 0.9;
}
.temp-status-button:active {
	opacity: 1.0;
}
.temp-status-hide-item {
	display: inline-block;
	cursor: pointer;
	margin: 0 0.5em 0 0 !important;
	padding: 1px 5px;
	border: 1px dotted;
	-webkit-border-radius: 4px;
	-moz-border-radius: 4px;
	border-radius: 4px;
	opacity: 0.6;
	background-color: rgba(100 100 100 / 0.2);
	font-weight: bold;
}
.temp-status-hide-item:hover {
	opacity: 0.9;
}
.temp-status-hide-item:active {
	opacity: 1.0;
}
`));

/*
 * LuCI's tooltip always starts with a hard-coded "▲ " (or "▼ " when it opens upwards).
 * ui.js fires "tooltip-open" right after filling it in, so the marker is removed here,
 * for the tooltips of the cards only (data-tooltip-style="temp-status").
 */
if(!window.tempStatusTooltipPatched) {
	window.tempStatusTooltipPatched = true;
	document.addEventListener('tooltip-open', (ev) => {
		let target = ev.detail && ev.detail.target;
		if(!target || target.getAttribute('data-tooltip-style') !== 'temp-status') return;
		let node = ev.target && ev.target.firstChild;
		if(node && node.nodeType === 3) {
			node.data = node.data.replace(/^[▲▼] /, '');
		}
		/* LuCI places a tooltip at the left edge of its target: line the bottom row's tooltip up with the name's */
		let card = target.closest('.temp-status-card');
		let name = card && card.querySelector('.temp-status-card-name');
		if(name && name !== target) {
			ev.target.style.left = (name.getBoundingClientRect().left + window.pageXOffset) + 'px';
			/* the tooltip lives in <body>: give it the size of the row it describes (as the Port cards' stats
			   tooltip, which sits inside the 80% text) and a normal weight */
			ev.target.style.fontSize = window.getComputedStyle(target).fontSize;
			ev.target.style.fontWeight = 'normal';
			/* "max: 85 °C" -> bold label, plain value, as in the Port cards' stats tooltip */
			let lines = ev.target.textContent.split('\n');
			ev.target.textContent = '';
			lines.forEach((line, n) => {
				let p = line.indexOf(': ');
				if(n > 0) ev.target.append(document.createElement('br'));
				if(p > 0) {
					ev.target.append(E('strong', {}, line.slice(0, p + 1) + ' '), line.slice(p + 2));
				} else {
					ev.target.append(line);
				}
			});
		}
	});
}

return baseclass.extend({
	title          : _('Temperature'),

	viewName       : 'temp-status',

	tempHot        : 95,

	tempOverheat   : 105,

	sensorsData    : null,

	tempData       : null,

	sensorsPath    : [],

	hiddenItems    : new Set(),

	hiddenNum      : E('span', {}),

	tempTable      : E('table', { 'class': 'table' }),

	tempArea       : E('div', { 'class': 'temp-status-temp-area' }),

	tempCard       : E('div', { 'class': 'temp-status-card-area' }),

	tempView       : E('div', {}),

	viewType       : 'card',

	callSensors : rpc.declare({
		object: 'luci.temp-status',
		method: 'getSensors',
		expect: { '': {} },
	}),

	callTempData: rpc.declare({
		object: 'luci.temp-status',
		method: 'getTempData',
		params: [ 'tpaths' ],
		expect: { '': {} },
	}),

	formatTemp(mc) {
		return Number((mc / 1000).toFixed(1));
	},

	sortFunc(a, b) {
		return (a.number > b.number) ? 1 : (a.number < b.number) ? -1 : 0;
	},

	// "cpu0_thermal" -> "cpu0"; the full name stays in the tooltip
	shortSensorName(sensor) {
		let s = String(sensor).replace(/[_ -]?thermal$/i, '');
		return (s.length > 0) ? s : String(sensor);
	},

	limitLabels: { max: 'max', critical: 'crit', emergency: 'emerg' },

	// Thermometer icon built with the DOM API (E() would treat a markup string inside an array as plain text).
	// The mercury color comes from --temp-color (see CSS).
	makeThermoIcon() {
		const ns = 'http://www.w3.org/2000/svg';
		const mk = (tag, attrs) => {
			const el = document.createElementNS(ns, tag);
			for(const k in attrs) el.setAttribute(k, attrs[k]);
			return el;
		};
		const svg = mk('svg', { 'class': 'temp-status-icon', 'viewBox': '0 0 14 28', 'aria-hidden': 'true' });
		svg.append(
			mk('path', { 'class': 'tube', 'd': 'M4.5 4.5a2.5 2.5 0 0 1 5 0v13.2a5 5 0 1 1-5 0z' }),
			mk('circle', { 'class': 'mercury', 'cx': '7', 'cy': '22', 'r': '2.8' }),
			mk('rect', { 'class': 'mercury', 'x': '6', 'y': '9', 'width': '2', 'height': '13', 'rx': '1' })
		);
		return svg;
	},

	restoreSettingsFromLocalStorage() {
		let hiddenItems = localStorage.getItem(`luci-app-${this.viewName}-hiddenItems`);
		if(hiddenItems) {
			this.hiddenItems = new Set(hiddenItems.split(','));
		};
		let view = localStorage.getItem(`luci-app-${this.viewName}-view`);
		if(view) {
			this.viewType = view;
		};
	},

	saveSettingsToLocalStorage() {
		localStorage.setItem(
			`luci-app-${this.viewName}-hiddenItems`, Array.from(this.hiddenItems).join(','));
		localStorage.setItem(
			`luci-app-${this.viewName}-view`, this.viewType);
	},

	makeTempTableContent() {
		this.tempTable.innerHTML = '';
		this.tempTable.append(
				E('tr', { 'class': 'tr table-titles' }, [
					E('th', { 'class': 'th left', 'width': '33%' }, _('Sensor')),
					E('th', { 'class': 'th left' }, _('Temperature')),
					E('th', { 'class': 'th right', 'width': '1%' }, ' '),
				])
			);

		if(this.sensorsData && this.tempData) {
			for(let [k, v] of Object.entries(this.sensorsData)) {
				v.sort(this.sortFunc);

				for(let i of Object.values(v)) {
					let sensor = i.title || i.item;

					if(i.sources === undefined) {
						continue;
					};

					i.sources.sort(this.sortFunc);

					for(let j of i.sources) {
						if(this.hiddenItems.has(j.path)) {
							continue;
						};

						let temp = this.tempData[j.path];
						let name = (j.label !== undefined) ? sensor + " / " + j.label :
							(j.item !== undefined) ? sensor + " / " + j.item.replace(/_input$/, "") : sensor

						if(temp !== undefined && temp !== null) {
							temp = this.formatTemp(temp);
						};

						let tempHot       = NaN;
						let tempOverheat  = NaN;
						let tpoints       = j.tpoints;
						let tpointsString = '';

						if(tpoints) {
							for(let i of Object.values(tpoints)) {
								let t = this.formatTemp(i.temp);
								tpointsString += `&#10;${i.type}: ${t} °C`;

								if(i.type == 'max' || i.type == 'critical' || i.type == 'emergency') {
									if(!(tempOverheat <= t)) {
										tempOverheat = t;
									};
								}
								else if(i.type == 'hot') {
									tempHot = t;
								};
							};
						};

						if(isNaN(tempHot) && isNaN(tempOverheat)) {
							tempHot      = this.tempHot;
							tempOverheat = this.tempOverheat;
						};

						let rowStyle = (temp >= tempOverheat) ? ' temp-status-overheat':
							(temp >= tempHot) ? ' temp-status-hot' : '';

						this.tempTable.append(
							E('tr', {
								'class'    : 'tr' + rowStyle,
								'data-path': j.path ,
							}, [
								E('td', {
										'class'     : 'td left',
										'data-title': _('Sensor')
									},
									(tpointsString.length > 0) ?
									`<span style="cursor:help; border-bottom:1px dotted" data-tooltip="${tpointsString}">${name}</span>` :
									name
								),
								E('td', {
										'class'     : 'td left',
										'data-title': _('Temperature')
									},
									(temp === undefined || temp === null) ? '-' : temp + ' °C'
								),
								E('td', {
										'class'     : 'td right',
										'data-title': _('Hide'),
										'title'     : _('Hide'),
									},
									E('span', {
										'class': 'temp-status-hide-item',
										'title': _('Hide'),
										'click': () => this.hideItem(j.path),
									}, '&#935;'),
								),
							])
						);
					};
				};
			};
		};

		if(this.tempTable.childNodes.length == 1) {
			this.tempTable.append(
				E('tr', { 'class': 'tr placeholder' },
					E('td', { 'class': 'td' },
						E('em', {}, _('No temperature sensors available'))
					)
				)
			);
		};

		return this.tempTable;
	},

	makeTempAreaContent() {
		this.tempArea.innerHTML = '';

		for(let [k, v] of Object.entries(this.sensorsData)) {
			v.sort(this.sortFunc);

			for(let i of Object.values(v)) {
				let sensor = i.title || i.item;

				if(i.sources === undefined) {
					continue;
				};

				i.sources.sort(this.sortFunc);

				for(let j of i.sources) {
					if(this.hiddenItems.has(j.path)) {
						continue;
					};

					let temp = this.tempData[j.path];
					let name = (j.label !== undefined) ? sensor + " / " + j.label :
						(j.item !== undefined) ? sensor + " / " + j.item.replace(/_input$/, "") : sensor

					if(temp !== undefined && temp !== null) {
						temp = this.formatTemp(temp);
					};

					let tempHot       = NaN;
					let tempOverheat  = NaN;
					let tpoints       = j.tpoints;
					let tpointsString = '';

					if(tpoints) {
						for(let i of Object.values(tpoints)) {
							let t = this.formatTemp(i.temp);
							tpointsString += `&#10;${i.type}: ${t} °C`;

							if(i.type == 'max' || i.type == 'critical' || i.type == 'emergency') {
								if(!(tempOverheat <= t)) {
									tempOverheat = t;
								};
							}
							else if(i.type == 'hot') {
								tempHot = t;
							};
						};
					};

					if(isNaN(tempHot) && isNaN(tempOverheat)) {
						tempHot      = this.tempHot;
						tempOverheat = this.tempOverheat;
					};

					let itemStyle = (temp >= tempOverheat) ? ' temp-status-overheat':
						(temp >= tempHot) ? ' temp-status-hot' : '';

					this.tempArea.append(
						E('div', { 'class': 'temp-status-list-item' + itemStyle }, [
							E('span', {
								'class': 'temp-status-hide-item',
								'title': _('Hide'),
								'click': () => this.hideItem(j.path),
							}, '&#935;'),
							E('span', {
								'class': 'temp-status-temp-value',
							}, (temp === undefined || temp === null) ? '-' : temp + ' °C'),
							E('span', {
								'class': 'temp-status-sensor-name'
							}, (tpointsString.length > 0) ?
								`<span style="cursor:help; border-bottom:1px dotted" data-tooltip="${tpointsString}">${name}</span>` :
								name
							),
						])
					);
				};
			};
		};

		if(this.tempArea.childNodes.length == 0) {
			this.tempArea.append(
				E('em', {}, _('No temperature sensors available'))
			);
		};

		return this.tempArea;
	},

	makeTempCardContent() {
		this.tempCard.innerHTML = '';

		for(let [k, v] of Object.entries(this.sensorsData)) {
			v.sort(this.sortFunc);

			for(let i of Object.values(v)) {
				let sensor = i.title || i.item;

				if(i.sources === undefined) {
					continue;
				};

				i.sources.sort(this.sortFunc);

				for(let j of i.sources) {
					if(this.hiddenItems.has(j.path)) {
						continue;
					};

					let temp = this.tempData[j.path];
					let suffix = (j.label !== undefined) ? " / " + j.label :
						(j.item !== undefined) ? " / " + j.item.replace(/_input$/, "") : "";
					let name = sensor + suffix;
					// on a card, a lone unlabeled "tempN" source adds nothing to the device name
					let genericSuffix = (j.label === undefined && /^temp[0-9]+_input$/.test(j.item || '') &&
						i.sources.length === 1);
					let shortName = this.shortSensorName(sensor) + (genericSuffix ? '' : suffix);

					if(temp !== undefined && temp !== null) {
						temp = this.formatTemp(temp);
					};

					let tempHot       = NaN;
					let tempOverheat  = NaN;
					let overType      = null;
					let tpoints       = j.tpoints;
					let tpointsArray  = [];

					if(tpoints) {
						for(let i of Object.values(tpoints)) {
							let t = this.formatTemp(i.temp);
							if(t <= 0 || t > 200) {
								continue;
							};
							tpointsArray.push(`${i.type}: ${t} °C`);

							if(i.type == 'max' || i.type == 'critical' || i.type == 'emergency') {
								if(!(tempOverheat <= t)) {
									tempOverheat = t;
									overType     = i.type;
								};
							}
							else if(i.type == 'hot') {
								tempHot = t;
							};
						};
					};

					if(isNaN(tempHot) && isNaN(tempOverheat)) {
						tempHot      = this.tempHot;
						tempOverheat = this.tempOverheat;
					};

					let hasTemp = (temp !== undefined && temp !== null);
					let state   = (temp >= tempOverheat) ? ' temp-status-card-overheat' :
						(temp >= tempHot) ? ' temp-status-card-hot' : '';
					let ratio   = hasTemp ? Math.min(Math.max(temp / tempOverheat, 0), 1) * 100 : 0;
					let limitType = overType || 'max';

					// Tooltips: the name shows the full sensor name, the bottom row the trip points.
					// (E() turns a null attribute value into the string "null": only add attributes that are set.)
					let infoAttrs = { 'class': 'ifacebox-body temp-status-card-info' };
					if(tpointsArray.length > 0) {
						infoAttrs['data-tooltip']       = tpointsArray.join('\n');
						infoAttrs['data-tooltip-style'] = 'temp-status';
					};

					this.tempCard.append(
						E('div', {
							'class': 'ifacebox temp-status-card' + state + (hasTemp ? '' : ' temp-status-card-nodata'),
							'style': `--temp-ratio: ${ratio}%;`,
						}, [
							E('div', { 'class': 'ifacebox-head temp-status-card-head' }, [
								E('span', {
									'class'             : 'temp-status-card-name',
									'data-tooltip'      : name,
									'data-tooltip-style': 'temp-status',
								}, E('span', { 'class': 'temp-status-card-name-text' }, document.createTextNode(shortName))),
								E('span', {
									'class': 'temp-status-hide-item',
									'title': _('Hide'),
									'click': () => this.hideItem(j.path),
								}, '×'),
							]),
							E('div', { 'class': 'ifacebox-body temp-status-card-main' }, [
								this.makeThermoIcon(),
								E('span', { 'class': 'temp-status-card-value' },
									hasTemp ? temp.toFixed(1) + ' °C' : '-'),
							]),
							E('div', { 'class': 'temp-status-gauge' }),
							E('div', infoAttrs, [
								E('span', { 'class': 'temp-status-info-label' }, this.limitLabels[limitType] || limitType),
								E('span', { 'class': 'temp-status-info-value' }, `${tempOverheat} °C`),
							]),
						])
					);
				};
			};
		};

		if(this.tempCard.childNodes.length == 0) {
			this.tempCard.append(
				E('em', {}, _('No temperature sensors available'))
			);
		};

		return this.tempCard;
	},

	makeViewContent() {
		this.tempView.innerHTML = '';
		this.tempView.append(
			(this.viewType == 'card') ? this.makeTempCardContent() :
			(this.viewType == 'list') ? this.makeTempAreaContent() : this.makeTempTableContent());
		this.hiddenNum.textContent = this.hiddenItems.size;
		let unhide = document.getElementById('temp-status-unhide-all');
		if(unhide) {
			unhide.style.display = (this.hiddenItems.size > 0) ? 'inline-block' : 'none';
		};
	},

	hideItem(path) {
		this.hiddenItems.add(path);
		this.saveSettingsToLocalStorage();
		this.makeViewContent();
	},

	unhideAllItems() {
		this.hiddenItems.clear();
		this.saveSettingsToLocalStorage();
		this.makeViewContent();
	},

	switchView() {
		this.tempView.innerHTML = '';
		// table -> list -> card -> table
		let views = [ 'table', 'list', 'card' ];
		this.viewType = views[(views.indexOf(this.viewType) + 1) % views.length];
		this.saveSettingsToLocalStorage();
		this.makeViewContent();
	},

	load() {
		this.restoreSettingsFromLocalStorage();
		if(this.sensorsData) {
			return (this.sensorsPath.length > 0) ?
				L.resolveDefault(this.callTempData(this.sensorsPath), null) :
					Promise.resolve(null);
		} else {
			return L.resolveDefault(this.callSensors(), null);
		};
	},

	render(data) {
		if(data) {
			if(!this.sensorsData) {
				this.sensorsData = data.sensors;
				this.sensorsPath = data.temp && new Array(...Object.keys(data.temp));
			};
			this.tempData = data.temp;
		};

		if(!this.sensorsData || !this.tempData) {
			return;
		};

		this.makeViewContent();

		return E('div', { 'class': 'cbi-section' }, [
			E('div', { 'id': 'temp-status-buttons-wrapper' }, [
				E('span', {
					'class': 'temp-status-button',
					'click': () => this.switchView(),
				}, _('Switch view')),
				E('span', {
					'id'   : 'temp-status-unhide-all',
					'class': 'temp-status-button',
					'style': `display:${(this.hiddenItems.size > 0) ? 'inline-block' : 'none'}`,
					'click': () => this.unhideAllItems(),
				}, [
					_('Show hidden sensors'),
					' (',
					this.hiddenNum,
					')',
				])
			]),
			this.tempView,
		]);
	},
});
