"use strict";

import { config } from "./config.js";
import {
	formatConditionSummary,
	formatHighLow,
	formatTemperature,
	formatTemperatureUnitBadge,
	formatTime,
	formatUpdatedTimestamp,
} from "./format.js";

const getAlertDetails = ( alerts ) => {
	if ( !Array.isArray( alerts ) || alerts.length === 0 ) {
		return null;
	}

	const [ firstAlert ] = alerts;
	const alertCount = alerts.length;
	const alertTitle = typeof firstAlert?.title === "string" && firstAlert.title.trim()
		? firstAlert.title.trim()
		: "Weather alert";

	return {
		label: alertCount > 1 ? `${ alertCount } weather alerts` : "Weather alert",
		title: alertTitle,
	};
};

const getTimestampMs = ( value ) => {
	if ( !value ) {
		return null;
	}

	const timestampMs = Date.parse( value );

	return Number.isFinite( timestampMs ) ? timestampMs : null;
};

const getIsDaylight = ( value, astronomy ) => {
	const timestampMs = getTimestampMs( value );
	const sunriseMs = getTimestampMs( astronomy?.sunrise );
	const sunsetMs = getTimestampMs( astronomy?.sunset );

	if ( timestampMs === null || sunriseMs === null || sunsetMs === null ) {
		return true;
	}

	return timestampMs >= sunriseMs && timestampMs < sunsetMs;
};

const getConditionIconName = ( value, isDaylight ) => {
	const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : "";

	if ( /(storm|thunder)/.test( normalizedValue ) ) {
		return "storm";
	}

	if ( /(snow|sleet|ice|flurr|hail)/.test( normalizedValue ) ) {
		return "snow";
	}

	if ( /(rain|drizzle|shower)/.test( normalizedValue ) ) {
		return "rain";
	}

	if ( /(fog|mist|haze|smoke)/.test( normalizedValue ) ) {
		return "fog";
	}

	if ( /(few|scattered|broken|partly)/.test( normalizedValue ) ) {
		return isDaylight ? "partly-cloudy-day" : "partly-cloudy-night";
	}

	if ( /(cloud|overcast)/.test( normalizedValue ) ) {
		return "cloud";
	}

	if ( /(clear|sunny)/.test( normalizedValue ) ) {
		return isDaylight ? "sun" : "moon";
	}

	return isDaylight ? "sun" : "moon";
};

const createMetrics = ( today, astronomy, timezone ) => {
	return [
		{
			iconName: "thermometer",
			isWide: true,
			label: "Today",
			value: formatHighLow( today?.tempC?.min, today?.tempC?.max, {
				unit: config.temperatureUnit,
			} ),
		},
		{
			iconName: "sunrise",
			label: "Sunrise",
			value: formatTime( astronomy?.sunrise, timezone ),
		},
		{
			iconName: "sunset",
			label: "Sunset",
			value: formatTime( astronomy?.sunset, timezone ),
		},
		{
			iconName: "moonrise",
			label: "Moonrise",
			value: formatTime( astronomy?.moonrise, timezone ),
		},
		{
			iconName: "moonset",
			label: "Moonset",
			value: formatTime( astronomy?.moonset, timezone ),
		},
	];
};

export const createDashboardViewModel = ( weatherPayload ) => {
	const timezone = weatherPayload?.timezone || "UTC";
	const current = weatherPayload?.current ?? {};
	const today = Array.isArray( weatherPayload?.daily ) ? weatherPayload.daily[ 0 ] ?? {} : {};
	const astronomy = weatherPayload?.astronomy ?? {};
	const conditionDescription = current?.condition?.desc || current?.condition?.main;
	const currentTimestamp = current?.time || weatherPayload?.updatedAt;
	const isDaylight = getIsDaylight( currentTimestamp, astronomy );

	return {
		alert: getAlertDetails( weatherPayload?.alerts ),
		conditionIconName: getConditionIconName( conditionDescription, isDaylight ),
		conditionSummary: formatConditionSummary( conditionDescription ),
		currentTemperature: formatTemperature( current?.tempC, {
			unit: config.temperatureUnit,
		} ),
		feelsLikeTemperature: formatTemperature( current?.feelsLikeC, {
			includeUnit: true,
			unit: config.temperatureUnit,
		} ),
		metrics: createMetrics( today, astronomy, timezone ),
		temperatureUnitBadge: formatTemperatureUnitBadge( config.temperatureUnit ),
		updatedLabel: formatUpdatedTimestamp(
			weatherPayload?.updatedAt || current?.time,
			timezone
		),
	};
};
