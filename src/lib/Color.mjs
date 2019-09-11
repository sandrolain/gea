export default class Color
{
	constructor()
	{
		this.r = 0;
		this.g = 0;
		this.b = 0;
		this.a = 1;
	}

	getLightness()
	{
		const {r, g, b} = this;

		return ((Math.max(r, g, b) + Math.min(r, g, b)) / 2) / 0xFF * 100;
	}

	getSaturation()
	{
		const {r, g, b} = this;

		const L		= this.getLightness();
		const max	= Math.max(r, g, b) / 0xFF;
		const min	= Math.min(r, g, b) / 0xFF;
		const D		= max - min;

		return (L === 0 || L === 1)
			? 0
			: (L > 50 ? D / (2 - max - min) : D / (max + min)) * 100;
	}

	getHue()
	{
		const r		= this.r / 0xFF;
		const g		= this.g / 0xFF;
		const b		= this.b / 0xFF;

		const max	= Math.max(r, g, b);
		const min	= Math.min(r, g, b);
		const D		= max - min;

		var	H		= 0;

		if(D > 0)
		{
			switch(max)
			{
				case r: H = (g - b) / D + (g < b ? 6 : 0); break;
				case g: H = (b - r) / D + 2; break;
				case b: H = (r - g) / D + 4; break;
			}
		}

		return H / 6 * 360;
	}

	getRgb()
	{
		const {r, g, b} = this;

		return [r, g, b];
	}

	getHsl()
	{
		const H = this.getHue();
		const S = this.getSaturation();
		const L = this.getLightness();


		return [H, S, L];
	}

	fromHsl(h, s, l)
	{
		var r, g, b;

		h /= 360;
		s /= 100;
		l /= 100;

		if(s == 0)
		{
			r = g = b = l;
		}
		else
		{
			const hue2rgb = (p, q, t)=>
			{
				if(t < 0) t += 1;
				if(t > 1) t -= 1;
				if(t < 1/6) return p + (q - p) * 6 * t;
				if(t < 1/2) return q;
				if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
				return p;
			}

			var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			var p = 2 * l - q;

			r = hue2rgb(p, q, h + 1/3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1/3);
		}

		const rgb = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];

		this.r = rgb[0];
		this.g = rgb[1];
		this.b = rgb[2];

		return rgb;
	}

	getRotatedHue(rotation)
	{
		const H			= this.getHue();
		const modulo	= (x, n) => (x % n + n) % n;
		const newHue	= modulo(H + rotation, 360);

		return newHue;
	}

	rotateHue(rotation)
	{
		const H = this.getRotatedHue(rotation);
		const S = this.getSaturation();
		const L = this.getLightness();

		return this.fromHsl(H, S, L);
	}

	getRotatedColor(rotation)
	{
		const H = this.getRotatedHue(rotation);
		const S = this.getSaturation();
		const L = this.getLightness();

		const color	= new Color();

		color.fromHsl(H, S, L);

		return color;
	}

	getComplementaryColor()
	{
		return this.getRotatedColor(180);
	}

	getTriadicColor()
	{
		return [
			this.getRotatedColor(120),
			this.getRotatedColor(-120)
		];
	}

	saturate(x)
	{
		const H = this.getHue();
		const L = this.getLightness();
		const S = Math.min(1, this.getSaturation() + x);

		return this.fromHsl(H, S, L);
	}

	desaturate(x)
	{
		const H = this.getHue();
		const L = this.getLightness();
		const S = Math.max(0, this.getSaturation() - x);

		return this.fromHsl(H, S, L);
	}

	lighten(x)
	{
		const H = this.getHue();
		const L = Math.min(1, this.getLightness() + x);
		const S = this.getSaturation();

		return this.fromHsl(H, S, L);
	}

	darken(x)
	{
		const H = this.getHue();
		const L = Math.max(0, this.getLightness() - x);
		const S = this.getSaturation();

		return this.fromHsl(H, S, L);
	}

	isGray()
	{
		return (this.getSaturation() === 0);
	}

	isDark()
	{
		return (this.getLightness() < 0.5);
	}

	isLight()
	{
		return (this.getLightness() > 0.5);
	}

	toString()
	{
		return this.toRgbaString();
	}

	toHexString()
	{
		return "#" +
			Color.getHex(this.r) +
			Color.getHex(this.g) +
			Color.getHex(this.b);
	}

	toHexaString()
	{
		return "#" +
			Color.getHex(this.r) +
			Color.getHex(this.g) +
			Color.getHex(this.b) +
			Color.getHex(this.a * 0xFF);
	}

	toRgbString()
	{
		return `rgb(${Math.round(this.r)}, ${Math.round(this.g)}, ${Math.round(this.b)})`;
	}

	toRgbaString()
	{
		return `rgba(${Math.round(this.r)}, ${Math.round(this.g)}, ${Math.round(this.b)}, ${this.a.toFixed(2)})`;
	}

	toHslString()
	{
		const hsl = this.getHsl();

		return `hsl(${Math.round(hsl[0])}, ${hsl[1].toFixed(2)}%, ${hsl[2].toFixed(2)}%)`;
	}

	toHslaString()
	{
		const hsl = this.getHsl();

		return `hsla(${Math.round(hsl[0])}, ${hsl[1].toFixed(2)}%, ${hsl[2].toFixed(2)}%, ${this.a.toFixed(2)})`;
	}


	static parse(val)
	{
		const color = new Color();

		if(typeof val == "string")
		{
			var m;

			m = val.match(/^#([0-9a-f]{3})$/i);

			if(m)
			{
				color.r = parseInt(m[1].charAt(0), 16) * 0x11;
				color.g = parseInt(m[1].charAt(1), 16) * 0x11;
				color.b = parseInt(m[1].charAt(2), 16) * 0x11;

				return color;
			}

			m = val.match(/^#([0-9a-f]{4})$/i);

			if(m)
			{
				color.r = parseInt(m[1].charAt(0), 16) * 0x11;
				color.g = parseInt(m[1].charAt(1), 16) * 0x11;
				color.b = parseInt(m[1].charAt(2), 16) * 0x11;
				color.a = parseInt(m[1].charAt(3), 16) / 0xF;

				return color;
			}

			m = val.match(/^#([0-9a-f]{6})$/i);

			if(m)
			{
				color.r = parseInt(m[1].substr(0,2), 16),
				color.g = parseInt(m[1].substr(2,2), 16),
				color.b = parseInt(m[1].substr(4,2), 16)

				return color;
			}

			m = val.match(/^#([0-9a-f]{8})$/i);

			if(m)
			{
				color.r = parseInt(m[1].substr(0,2), 16),
				color.g = parseInt(m[1].substr(2,2), 16),
				color.b = parseInt(m[1].substr(4,2), 16)
				color.a = parseInt(m[1].substr(6,2), 16) / 0xFF

				return color;
			}

			m = val.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);

			if(m)
			{
				color.r = parseInt(m[1], 10);
				color.g = parseInt(m[2], 10);
				color.b = parseInt(m[3], 10);

				return color;
			}

			m = val.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i);

			if(m)
			{
				color.r = parseInt(m[1], 10);
				color.g = parseInt(m[2], 10);
				color.b = parseInt(m[3], 10);
				color.a = parseFloat(m[4], 10);

				return color;
			}

			m = val.match(/^hsl\s*\(\s*(\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)$/i);

			if(m)
			{
				color.fromHsl(parseFloat(m[1], 10), parseFloat(m[2], 10), parseFloat(m[3], 10));

				return color;
			}

			m = val.match(/^hsla\s*\(\s*(\d+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*,\s*([\d.]+)\s*\)$/i);

			if(m)
			{
				color.fromHsl(parseFloat(m[1], 10), parseFloat(m[2], 10), parseFloat(m[3], 10));
				color.a = parseFloat(m[4], 10);

				return color;
			}
		}
		else if(val instanceof Array)
		{
			color.r = this.getInt(val[0]);
			color.g = this.getInt(val[1]);
			color.b = this.getInt(val[2]);
		}

		return color;
	}

	static getInt(val)
	{
		var I = parseInt(val, 10);

		return isNaN(I) ? 0 : I;
	}

	static getFloat(val)
	{
		var I = parseFloat(val, 10);

		return isNaN(I) ? 0 : I;
	}

	static getHex(val)
	{
		return ("0" + Math.round(val).toString(16)).substr(-2).toUpperCase();
	}
}
