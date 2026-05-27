"use strict";

const normalizeRenderOrientation = ( value ) => {
	return value === "landscape" ? "landscape" : "portrait";
};

const normalizeTemperatureUnit = ( value ) => {
	return value === "celsius" ? "celsius" : "fahrenheit";
};

const normalizeWeatherSource = ( value ) => {
	return value === "fixture" ? "fixture" : "live";
};

const normalizeBoolean = ( value ) => {
	return value === "1" || value === "true";
};

const parseInteger = ( value, fallbackValue ) => {
	const parsedValue = Number.parseInt( value ?? "", 10 );

	return Number.isFinite( parsedValue ) ? parsedValue : fallbackValue;
};

const parsePositiveFloat = ( value, fallbackValue = null ) => {
	const parsedValue = Number.parseFloat( value ?? "" );

	return Number.isFinite( parsedValue ) && parsedValue > 0
		? parsedValue
		: fallbackValue;
};

const getDefaultRenderDimensions = ( orientation ) => {
	return orientation === "landscape"
		? {
			height: 1072,
			width: 1448,
		}
		: {
			height: 1448,
			width: 1072,
		};
};

const renderIntervalMs = parseInteger( process.env.RENDER_INTERVAL_MS, 15 * 60 * 1000 );
const renderOrientation = normalizeRenderOrientation( process.env.RENDER_ORIENTATION );
const temperatureUnit = normalizeTemperatureUnit( process.env.TEMPERATURE_UNIT || "fahrenheit" );
const defaultRenderDimensions = getDefaultRenderDimensions( renderOrientation );

export const config = {
	host: process.env.HOST || "0.0.0.0",
	outputNormalize: normalizeBoolean( process.env.RENDER_OUTPUT_NORMALIZE ),
	outputPath: process.env.OUTPUT_PATH || "./data/latest.png",
	outputSharpenSigma: parsePositiveFloat( process.env.RENDER_OUTPUT_SHARPEN_SIGMA ),
	port: parseInteger( process.env.PORT, 8788 ),
	renderHeight: parseInteger( process.env.RENDER_HEIGHT, defaultRenderDimensions.height ),
	renderIntervalMs,
	renderOrientation,
	renderStaleAfterMs: parseInteger(
		process.env.RENDER_STALE_AFTER_MS,
		renderIntervalMs * 2
	),
	renderWidth: parseInteger( process.env.RENDER_WIDTH, defaultRenderDimensions.width ),
	tempOutputPath: process.env.TEMP_OUTPUT_PATH || "./data/latest.tmp.png",
	temperatureUnit,
	timeoutMs: parseInteger(
		process.env.RENDER_TIMEOUT_MS || process.env.TIMEOUT_MS,
		30 * 1000
	),
	weatherApiUrl:
		process.env.WEATHER_API_URL || "http://svc-01.home.arpa:8787/weather/home",
	weatherFixturePath:
		process.env.WEATHER_FIXTURE_PATH || "./src/fixtures/weather.sample.json",
	weatherSource: normalizeWeatherSource( process.env.WEATHER_SOURCE ),
};

export const getRenderDimensions = ( orientation = config.renderOrientation ) => {
	const resolvedOrientation = normalizeRenderOrientation( orientation );

	if ( resolvedOrientation === config.renderOrientation ) {
		return {
			height: config.renderHeight,
			width: config.renderWidth,
		};
	}

	return {
		height: config.renderWidth,
		width: config.renderHeight,
	};
};