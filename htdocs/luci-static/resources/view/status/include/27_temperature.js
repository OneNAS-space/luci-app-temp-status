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

/* 状态颜色定义 */
.temp-status-hot { background-color: var(--app-temp-status-hot-color) !important; color: var(--app-temp-status-font-color) !important; }
.temp-status-overheat { background-color: var(--app-temp-status-overheat-color) !important; color: var(--app-temp-status-font-color) !important; }
.temp-status-hot td, .temp-status-overheat td, .temp-status-hot .td, .temp-status-overheat .td { color: var(--app-temp-status-font-color) !important; }

/* 容器布局 */
.temp-status-temp-area {
	width: 100%;
	padding: 0 0 1em 0;
	display: flex;
	align-items: flex-start;
	justify-content: flex-start;
	flex-wrap: wrap;
	flex-direction: row;
}

/* --- 卡片视图样式 (dev 特色) --- */
.temp-status-list-item {
	display: flex !important;
	flex-direction: column !important;
	justify-content: space-between !important;
	align-items: center !important;
	flex-grow: 1;
	flex-shrink: 0;
	width: 100px !important;
	max-width: 110px !important;
	min-width: 80px !important;
	height: 100px !important;
	margin: 5px 4px !important;
	padding: 0 !important;
	border: 1px solid var(--app-temp-status-border-color) !important;
	border-radius: 4px;
	overflow: hidden;
	position: relative;
	background: rgba(0,0,0,0.02);
}

/* 动态水位层 */
.temp-status-list-item::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 0;
	width: 100%;
	height: var(--temp-ratio, 0%);
	background: var(--temp-color, #52c41a);
	opacity: 0.12;
	transition: height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
	z-index: 1;
	pointer-events: none;
}

.temp-status-sensor-name {
	order: 1; width: 100%; height: 24px; line-height: 24px;
	background: rgba(0,0,0,0.05); font-size: 90%; font-weight: bold;
	text-align: center; padding: 0 4px !important;
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis; z-index: 2;
}

.temp-status-temp-value {
	order: 2; flex-grow: 1; width: 100% !important; margin: 0 !important;
	display: flex !important; align-items: center !important; justify-content: center !important;
	font-size: 13px; z-index: 2;
}

.temp-status-temp-value::before { content: '🌡️'; margin-right: 4px; }

/* 隐藏按钮样式 */
.temp-status-hide-item {
	cursor: pointer; padding: 1px 5px; border-radius: 4px;
	opacity: 0.6; background-color: rgba(100 100 100 / 0.1);
}
.temp-status-list-item .temp-status-hide-item {
	position: absolute; top: 0; right: 0; z-index: 10;
	background: none; border: none; font-size: 10px; color: #bbb;
}
.temp-status-hide-item:hover { opacity: 1; color: #ff4d4f; }

/* 按钮组样式 */
#temp-status-buttons-wrapper { margin-bottom: 1em; }
.temp-status-button {
	display: inline-block; cursor: pointer; margin: 2px 4px 2px 0 !important;
	padding: 3px 8px; border: 1px solid var(--app-temp-status-border-color);
	border-radius: 4px; opacity: 0.8; background: rgba(100,100,100,0.05);
}
.temp-status-button:hover { opacity: 1; background: rgba(100,100,100,0.1); }

/* 移动端适配 */
@media screen and (max-width: 480px) {
	.temp-status-list-item {
		flex-basis: 22% !important;
		max-width: 23% !important;
		aspect-ratio: 1 / 1 !important;
		height: auto !important;
		margin: 4px 1% !important;
	}
	.temp-status-sensor-name { font-size: 80% !important; height: 20px !important; line-height: 20px !important; }
	.temp-status-temp-value { font-size: 10px !important; }
}
`));

return baseclass.extend({
	title: _('Temperature'),
	viewName: 'temp-status',
	tempHot: 95,
	tempOverheat: 105,
	sensorsData: null,
	tempData: null,
	sensorsPath: [],
	hiddenItems: new Set(),
	hiddenNum: E('span', {}),
	tempTable: E('table', { 'class': 'table' }),
	tempArea: E('div', { 'class': 'temp-status-temp-area' }),
	tempView: E('div', {}),
	viewType: 'table',

	callSensors: rpc.declare({ object: 'luci.temp-status', method: 'getSensors', expect: { '': {} } }),
	callTempData: rpc.declare({ object: 'luci.temp-status', method: 'getTempData', params: [ 'tpaths' ], expect: { '': {} } }),

	formatTemp(mc) { return Number((mc / 1000).toFixed(1)); },
	sortFunc(a, b) { return (a.number > b.number) ? 1 : (a.number < b.number) ? -1 : 0; },

	restoreSettingsFromLocalStorage() {
		let hiddenItems = localStorage.getItem(`luci-app-${this.viewName}-hiddenItems`);
		if(hiddenItems) this.hiddenItems = new Set(hiddenItems.split(','));
		let view = localStorage.getItem(`luci-app-${this.viewName}-view`);
		if(view) this.viewType = view;
	},

	saveSettingsToLocalStorage() {
		localStorage.setItem(`luci-app-${this.viewName}-hiddenItems`, Array.from(this.hiddenItems).join(','));
		localStorage.setItem(`luci-app-${this.viewName}-view`, this.viewType);
	},

	// 核心数据循环逻辑：结合 master 的严谨性和 dev 的简洁性
	renderItems(callback) {
		let count = 0;
		if(!this.sensorsData || !this.tempData) return count;

		for(let [k, v] of Object.entries(this.sensorsData)) {
			v.sort(this.sortFunc);
			for(let i of v) {
				let sensor = i.title || i.item;
				if(!i.sources) continue;
				i.sources.sort(this.sortFunc);

				for(let j of i.sources) {
					if(this.hiddenItems.has(j.path)) continue;

					let rawTemp = this.tempData[j.path];
					let temp = (rawTemp !== undefined && rawTemp !== null) ? this.formatTemp(rawTemp) : null;
					let name = (j.label !== undefined) ? sensor + " / " + j.label : 
							   (j.item !== undefined) ? sensor + " / " + j.item.replace(/_input$/, "") : sensor;
					
					let tpointsString = '';
					let tHot = NaN, tOver = NaN;

					if(j.tpoints) {
						for(let tp of Object.values(j.tpoints)) {
							let t = this.formatTemp(tp.temp);
							tpointsString += `&#10;${tp.type}: ${t} °C`;
							if(['max','critical','emergency'].includes(tp.type)) {
								if(isNaN(tOver) || t < tOver) tOver = t;
							} else if(tp.type == 'hot') {
								tHot = t;
							}
						}
					}

					// 优先级：传感器自带阈值 > 默认全局阈值
					let finalHot = isNaN(tHot) ? this.tempHot : tHot;
					let finalOver = isNaN(tOver) ? this.tempOverheat : tOver;

					let ratio = Math.min(Math.max((temp || 0) / finalOver, 0), 1) * 100;
					let color = (temp >= finalOver) ? '#ff4d4f' : (temp >= finalHot ? '#faad14' : '#52c41a');
					let style = (temp >= finalOver) ? ' temp-status-overheat' : (temp >= finalHot) ? ' temp-status-hot' : '';
					
					callback(j.path, name, temp, style, tpointsString, ratio, color);
					count++;
				}
			}
		}
		return count;
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

		let count = this.renderItems((path, name, temp, rowStyle, tpointsString) => {
			this.tempTable.append(E('tr', { 'class': 'tr' + rowStyle, 'data-path': path }, [
				E('td', { 'class': 'td left', 'data-title': _('Sensor') }, 
					(tpointsString.length > 0) ? E('span', { 'style': 'cursor:help; border-bottom:1px dotted', 'data-tooltip': tpointsString }, name) : name
				),
				E('td', { 'class': 'td left', 'data-title': _('Temperature') }, (temp === null) ? '-' : temp + ' °C'),
				E('td', { 'class': 'td right' }, E('span', { 'class': 'temp-status-hide-item', 'click': () => this.hideItem(path), 'title': _('Hide') }, '&#935;'))
			]));
		});

		if(count === 0) {
			this.tempTable.append(E('tr', { 'class': 'tr placeholder' }, E('td', { 'class': 'td' }, E('em', {}, _('No temperature sensors available')))));
		}
		return this.tempTable;
	},

	makeTempAreaContent() {
		this.tempArea.innerHTML = '';
		let count = this.renderItems((path, name, temp, itemStyle, tpointsString, ratio, color) => {
			let displayTemp = (temp === null) ? '-' : temp + ' °C';
			this.tempArea.append(
				E('div', { 
					'class': 'temp-status-list-item' + itemStyle,
					'style': `--temp-ratio: ${ratio}%; --temp-color: ${color};` 
				}, [
					E('span', { 'class': 'temp-status-hide-item', 'click': (ev) => { ev.stopPropagation(); this.hideItem(path); } }, '&#935;'),
					E('span', { 
						'class': 'temp-status-temp-value',
						'data-tooltip': tpointsString.length > 0 ? tpointsString : null,
						'style': tpointsString.length > 0 ? 'cursor:help' : ''
					}, displayTemp),
					E('span', { 'class': 'temp-status-sensor-name', 'title': name }, name)
				])
			);
		});

		if(count === 0) {
			this.tempArea.append(E('em', {}, _('No temperature sensors available')));
		}
		return this.tempArea;
	},

	makeViewContent() {
		this.tempView.innerHTML = '';
		this.tempView.append((this.viewType === 'list') ? this.makeTempAreaContent() : this.makeTempTableContent());
		this.hiddenNum.textContent = this.hiddenItems.size;
		let unhide = document.getElementById('temp-status-unhide-all');
		if(unhide) unhide.style.display = (this.hiddenItems.size > 0) ? 'inline-block' : 'none';
	},

	hideItem(path) { this.hiddenItems.add(path); this.saveSettingsToLocalStorage(); this.makeViewContent(); },
	unhideAllItems() { this.hiddenItems.clear(); this.saveSettingsToLocalStorage(); this.makeViewContent(); },
	switchView() { this.viewType = (this.viewType === 'list') ? 'table' : 'list'; this.saveSettingsToLocalStorage(); this.makeViewContent(); },

	load() {
		this.restoreSettingsFromLocalStorage();
		if(this.sensorsData) {
			return (this.sensorsPath.length > 0) ? L.resolveDefault(this.callTempData(this.sensorsPath), null) : Promise.resolve(null);
		}
		return L.resolveDefault(this.callSensors(), null);
	},

	render(data) {
		if(data) {
			if(!this.sensorsData) {
				this.sensorsData = data.sensors;
				this.sensorsPath = data.temp ? Object.keys(data.temp) : [];
			}
			this.tempData = data.temp;
		}

		if(!this.sensorsData || !this.tempData) return E('div', {}, E('em', {}, _('Loading sensor data...')));

		this.makeViewContent();

		return E('div', { 'class': 'cbi-section' }, [
			E('div', { 'id': 'temp-status-buttons-wrapper' }, [
				E('span', { 'class': 'temp-status-button', 'click': () => this.switchView() }, _('Switch view')),
				E('span', { 
					'id': 'temp-status-unhide-all', 
					'class': 'temp-status-button', 
					'style': `display:${(this.hiddenItems.size > 0) ? 'inline-block' : 'none'}`,
					'click': () => this.unhideAllItems() 
				}, [ _('Show hidden sensors'), ' (', this.hiddenNum, ')' ])
			]),
			this.tempView
		]);
	}
});
