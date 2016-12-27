import { clusterize } from './clusterizer';

window.log = console.log;

var locationsElement = document.querySelector('#locations');
var locationsCsv = locationsElement.innerText.trim();
var coordinatePairs = locationsCsv.split('\n')
.map(line => line.split(','))
.map(([ id, lat, long ]) => ({ id, lat, long }));

// Just a small selection, for now
coordinatePairs = coordinatePairs.slice(0, 50);

const { el, list, mount } = redom;

class Marker {
	get weight() {
		return this.data && this.data.weight || 1;
	}

	constructor() {
		this.el = el('.marker');
		this.el.onmouseover = () => {
			if (!this.data)
				return;

			function format(number) {
				return number.toFixed(3);
			}

			var x = format(this.data.x);
			var y = format(this.data.y);

			this.el.classList.add('hover');

			this.el.append(
				this.popover = el('.popover',
					`id: ${this.data.id}\nweight: ${this.weight}\nx: ${x}\ny: ${y}`));

			this.popover.addEventListener('transitionend', () => {
				if (this.popover) {
					this.el.removeChild(this.popover);
					this.popover = null;
				}
			});
		};

		this.el.onmouseout = () => {
			if (!this.data)
				return;

			this.el.classList.remove('hover');
		};
	}

	update(data) {
		var { id, x, y } = this.data = data;
		this.el.style.left = x + 'px';
		this.el.style.top = y + 'px';
	}
}

// Position of click event 'click' relative to element 'el'
function relativePos(el, click) {
	var rect = el.getBoundingClientRect();
	var x = click.clientX - rect.left;
	var y = click.clientY - rect.top;
	return { x, y };
}

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

class Map {
	constructor() {
		this.el = el('.map',
			this.markers = el('.markers'),
			this.list = list(this.markers, Marker, 'id'),
			this.zoomIn = el('.zoom.zoom-in'),
			this.zoomOut = el('.zoom.zoom-out'),
			this.debug = el('.debug',
				this.debugX = el('.x'),
				this.debugY = el('.y'),
				this.debugZoomLevel = el('.zoomLevel'))
		);

		this.dragStartPos = null;

		// Drag handling
		this.markers.onmousedown = (ev) => {
			this.dragStartPos = relativePos(this.el, ev);

			const mouseup = (ev) => {
				window.removeEventListener('mouseup', mouseup);
				window.removeEventListener('mousemove', mousemove);

				var finalPos = relativePos(this.el, ev);
				if (typeof this.dragStartPos !== 'object')
					return;

				var diff = {
					x: finalPos.x - this.dragStartPos.x,
					y: finalPos.y - this.dragStartPos.y
				};

				if (Math.abs(diff.x) + Math.abs(diff.y) < 3) {
					this.dragStartPos = null;
					return;
				}

				var screenCoordinateMultiplier = Math.pow(0.5, this.pos.zoomLevel);

				this.markers.classList.add('disable-transition');
				this.markers.style.left = this.markers.style.top = 0;
				this.pos.x = this.pos.x - screenCoordinateMultiplier * diff.x;
				this.pos.y = this.pos.y - screenCoordinateMultiplier * diff.y;
				this.render();

				// Required for the layout engine to believe that .disable-transition is on
				this.markers.offsetHeight;

				// A click event will happen between now and the following setTimeout() handler.
				// Since we just finished dragging, arrange for the event to be ignored.
				this.dragStartPos = 'preventClickEvent';
				setTimeout(() => {
					this.dragStartPos = null;

					this.markers.classList.remove('disable-transition');
				}, 0);
			};

			const mousemove = (ev) => {
				if (this.dragStartPos && typeof this.dragStartPos === 'object') {
					var newPos = relativePos(this.el, ev);
					this.markers.style.left = (newPos.x - this.dragStartPos.x) + 'px';
					this.markers.style.top = (newPos.y - this.dragStartPos.y) + 'px';
				}
			};

			window.addEventListener('mouseup', mouseup);
			window.addEventListener('mousemove', mousemove);
		};

		// Click to zoom
		this.el.onclick = (ev) => {
			if (this.dragStartPos)
				return;

			var click = relativePos(this.el, ev);

			var screenCoordinateMultiplier = Math.pow(0.5, this.pos.zoomLevel);

			// This brings (x, y) to the position that was clicked
			this.pos.x += screenCoordinateMultiplier * (click.x - 128);
			this.pos.y += screenCoordinateMultiplier * (click.y - 128);

			this.pos.zoomLevel = clamp(this.pos.zoomLevel + 1, 0, 21);

			// But we want to adjust it so that the clicked position stays in place
			// So do a back-adjustment with the new screenCoordinateMultiplier
			screenCoordinateMultiplier = Math.pow(0.5, this.pos.zoomLevel);
			this.pos.x -= screenCoordinateMultiplier * (click.x - 128);
			this.pos.y -= screenCoordinateMultiplier * (click.y - 128);

			this.render();
		};

		this.zoomIn.onclick = (ev) => {
			this.pos.zoomLevel = clamp(this.pos.zoomLevel + 1, 0, 21);
			ev.stopPropagation();
			this.render();
		};

		this.zoomOut.onclick = (ev) => {
			this.pos.zoomLevel = clamp(this.pos.zoomLevel - 1, 0, 21);
			ev.stopPropagation();
			this.render();
		};
	}

	render() {
		this.update(this.pos, this.coordinatePairs);
	}

	update(pos, coordinatePairs) {
		this.pos = pos;

		this.coordinatePairs = coordinatePairs;
		var processed = this.process(pos, this.coordinatePairs);
		this.list.update(processed);

		this.debugZoomLevel.textContent = 'zoom ' + pos.zoomLevel;
		this.debugX.textContent = 'x ' + pos.x.toFixed(6);
		this.debugY.textContent = 'y ' + pos.y.toFixed(6);
	}

	process(pos, coordinatePairs) {
		var result = coordinatePairs.map(({ id, lat, long }) => {
			var zoom = Math.pow(2, pos.zoomLevel);
			var lambda = long / 180 * Math.PI;
			var x = 128 / Math.PI * (lambda + Math.PI) - pos.x;

			var phi = lat / 180 * Math.PI;
			var y = 128 / Math.PI * (Math.PI - Math.log(Math.tan(Math.PI / 4 + phi / 2))) - pos.y;

			return { id, x: zoom * x, y: zoom * y };
		}).map(({ id, x, y }) => {
			return {
				id,
				x: x + 128,
				y: y + 128
			};
		});

		result = result.filter(({ x, y }) => {
			return x < 256;
		});

		// log('coordinate pairs', JSON.stringify(result, null, 2));
		return result;
	}
}

var initialPos = {
	x: 145.734,
	y: 74.092,
	zoomLevel: 12
};

var map = new Map;
map.update(initialPos, coordinatePairs);
mount(document.body, map);

