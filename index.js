let store = {};
const loadData = () => {
  return Promise.all([
    d3.csv("routes.csv"),
    d3.json("countries.geo.json")
  ]).then(dataSets => {
    store.routes = dataSets[0];
    store.geoJSON = dataSets[1]
    return store;
  })
}

const groupByAirline = (data) => {
  //Iterate over each route, producing a dictionary where the keys is are the ailines ids and the values are the information of the airline.
  let result = data.reduce((result, d) => {
    let currentData = result[d.AirlineID] || {
      "AirlineID": d.AirlineID,
      "AirlineName": d.AirlineName,
      "Count": 0
    }
    
    currentData.Count += 1;
    
    result[d.AirlineID] = currentData;

    return result;
  }, {})

  //We use this to convert the dictionary produced by the code above, into a list, that will make it easier to create the visualization. 
  result = Object.keys(result).map(key => result[key]);
  result = result.sort((a, b) => d3.descending(a.Count, b.Count));

  return result;
}

const drawAirlinesChart = (airlines) => {
  let config = getAirlinesChartConfig();
  let scales = getAirlinesChartScales(airlines, config);

  drawBarsAirlinesChart(airlines, scales, config);
  drawAxesAirlinesChart(airlines, scales, config);
}

const getAirlinesChartConfig = () => {
  let width = 400;
  let height = 600;
  let margin = {
      top: 10,
      bottom: 50,
      left: 130,
      right: 10
  }
  //The body is the are that will be occupied by the bars.
  let bodyHeight = height - margin.top - margin.bottom;
  let bodyWidth = width - margin.left - margin.right;
  
  //The container is the SVG where we will draw the chart. In our HTML is the svg ta with the id AirlinesChart
  let container = d3.select("#AirlinesChart"); 
  container
      .attr("width", width)
      .attr("height", height)

  return { 
    width, height, margin, bodyHeight, bodyWidth, container 
  }
}

const getAirlinesChartScales = (airlines, config) => {
  let { bodyWidth, bodyHeight } = config;
  let maximunCount = d3.max(airlines, d => d.Count);

  let xScale = d3.scaleLinear()
                  .range([0, bodyWidth])
                  .domain([0, maximunCount])

  let yScale = d3.scaleBand()
      .range([0, bodyHeight])
      .domain(airlines.map(a => a.AirlineName)) //The domain is the list of ailines names
      .padding(0.2)
      
  return { xScale, yScale }
}

const drawBarsAirlinesChart = (airlines, scales, config) => {
  let {margin, container} = config; // this is equivalent to 'let margin = config.margin; let container = config.container'
  let {xScale, yScale} = scales
  let body = container.append("g")
      .style("transform", 
        `translate(${margin.left}px,${margin.top}px)`
      )

  let bars = body.selectAll(".bar")
                  .data(airlines)

  //Adding a rect tag for each airline
  bars.enter().append("rect")
      .attr("height", yScale.bandwidth())
      .attr("y", (d) => yScale(d.AirlineName))
      .attr("width", d => xScale(d.Count))
      .attr("fill", "#2a5599")
      .on("mouseenter", function (d) {
        drawRoutes(d.AirlineID);
        d3.select(this).attr("fill", "#992a5b")
      })
      .on("mouseleave", function (d) {
        drawRoutes(null);
        d3.select(this).attr("fill", "#2a5599")
      })
}

const drawAxesAirlinesChart = (airlines, scales, config) => {
  let { xScale, yScale } = scales
  let { container, margin, height } = config;

  let axisX = d3.axisBottom(xScale)
                .ticks(5)

  container.append("g")
            .style("transform",
              `translate(${margin.left}px,${height - margin.bottom}px)`
            )
            .call(axisX)

  let axisY = d3.axisLeft(yScale)
  container.append("g")
            .style("transform",
              `translate(${margin.left}px,${margin.top}px)`
            )
            .call(axisY)
}

const getMapConfig = () => {
  let width = 900;
  let height = 600;
  let container = d3.select("#Map")
                    .attr("width", width)
                    .attr("height", height)
  
  return {
    width, height, container
  }
}

const getMapProjection = (config) => {
  let {width, height} = config;
  let projection = d3.geoMercator();
  
  projection.scale(97)
            .translate([width / 2, height / 2 + 20])
            
  store.mapProjection = projection;
  return projection;
}

const drawBaseMap = (container, countries, projection) => {
  let path = d3.geoPath().projection(projection);
  
  container.selectAll("path").data(countries)
            .enter().append("path")
            .attr("d", path)
            .attr("stroke", "#ccc")
            .attr("fill", "#eee")
}

const drawMap = (geoJeon) => {
  let config = getMapConfig();
  let projection = getMapProjection(config)
  drawBaseMap(config.container, geoJeon.features, projection)
}

const groupByAirport = (data) => {
  //We use reduce to transform a list into a object where each key points to an aiport. This way makes it easy to check if is the first time we are seeing the airport.
  let result = data.reduce((result, d) => {
      //The || sign in the line below means that in case the first option is anything that Javascript consider false (this insclude undefined, null and 0), the second option will be used. Here if result[d.DestAirportID] is false, it means that this is the first time we are seeing the airport, so we will create a new one (second part after ||)
      let currentDest = result[d.DestAirportID] || {
          "AriportID": d.DestAirportID,
          "Airport": d.DestAirport,
          "Latitude": +d.DestLatitude,
          "Longitude": +d.DestLongitude,
          "City": d.DestCity,
          "Country": d.DestCountry,
          "Count": 0
      }
      currentDest.Count += 1
      result[d.DestAirportID] = currentDest

      //After doing for the destination airport, we also update the airport the airplane is departing from.
      let currentSource = result[d.SourceAirportID] || {
          "AriportID": d.SourceAirportID,
          "Airport": d.SourceAirport,
          "Latitude": +d.SourceLatitude,
          "Longitude": +d.SourceLongitude,
          "City": d.SourceCity,
          "Country": d.SourceCountry,
          "Count": 0
      }

      currentSource.Count += 1
      result[d.SourceAirportID] = currentSource
      return result
  }, {})
  //We map the keys to the actual ariorts, this is an way to transform the object we got in the previous step into a list.
  result = Object.keys(result).map(key => result[key])
  return result
}

const drawAirports = (airports) => {
  let config = getMapConfig();
  let projection = getMapProjection(config)
  let container = config.container;
  let circles = container.selectAll("circle");
  circles.data(airports).enter()
          .append("circle")
          .attr("r", 1)
          .attr("cx", d => projection([d.Longitude, d.Latitude])[0])
          .attr("cy", d => projection([d.Longitude, d.Latitude])[1])
          .attr("fill", "#2a5599")
}

const drawRoutes = (airlineID) => {
  let routes = store.routes

  let projection = store.mapProjection
  let container = d3.select("#Map")
  let selectedRoutes = routes.filter(d => d.AirlineID == airlineID)
  // console.log(selectedRoutes)
  
  let bindedData = container.selectAll("line")
      .data(selectedRoutes, d => d.ID) //This second parameter tells D3 what to use to identify the routes, this hepls D3 to correctly find which routes have been added or removed.

  bindedData.enter().append("line")
            .attr("x1", d => projection([d.SourceLongitude, d.SourceLatitude])[0])
            .attr("y1", d => projection([d.SourceLongitude, d.SourceLatitude])[1])
            .attr("x2", d => projection([d.DestLongitude, d.DestLatitude])[0])
            .attr("y2", d => projection([d.DestLongitude, d.DestLatitude])[1])
            .attr("stroke", "#992a2a")
            .attr("opacity", 1)

  bindedData.exit().remove();
}

const showData = () => {
  //Get the routes from our store variable
  let routes = store.routes
  
  // Compute the number of routes per airline.
  let airlines = groupByAirline(store.routes);
  // console.log(airlines);

  // Draw airlines barchart
  drawAirlinesChart(airlines);
  drawMap(store.geoJSON)

  let airports = groupByAirport(store.routes);
  drawAirports(airports)

  // drawRoutes("24")
}

loadData().then(showData);