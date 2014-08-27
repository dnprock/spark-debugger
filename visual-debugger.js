/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

visualDebugger = {

  htmlDecode: function(input){
    var e = document.createElement('div');
    e.innerHTML = input;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
  },
  drawD3Document: function(stagesData) {
    var WIDTH = 800, HEIGHT = 1000;
    var graphData = [];

    var nodes = [];
    var nodesMap = {};
  
    for (var i = 0; i < Object.keys(stagesData).length; i++) {
      var cStage = Object.keys(stagesData)[i];
      var stackData = stagesData[cStage];
    
      var callData = this.htmlDecode(stackData).split("\n");
      var prevNode = null;
    
      for (var j = 0; j < callData.length; j++) {
        var call = callData[j].trim();
        
        if (call !== "") {
          if (!nodesMap[call]) {
            // new node
            var n = {name: call, stages: [cStage], children: null};
            nodes.push(n);
            nodesMap[n.name] = n;
          } else {
            nodesMap[call].stages.push(cStage);
          }

          if (prevNode !== null) {
            var link = {};
      
            link.source = nodesMap[call];
            link.target = prevNode;
            
            link.target.parent = link.source.name;
            if (link.source.children) {
              var found = false;
              link.source.children.forEach(function(c) {
                if (c.name === link.target.name) {
                  found = true;
                }
              });
              if (!found) {
                link.source.children.push(link.target);
              }
            } else {
              link.source.children = [link.target];
            }

            graphData.push(link);
          }

          prevNode = nodesMap[call];
        }
      }
    }

    var width = WIDTH,
        height = HEIGHT;

    var root;
    for (var i = 0; i < nodes.length; i++) {
      if (!nodes[i].parent) {
        root = nodes[i];
      }
    }
    
    var tree = d3.layout.tree()
                .size([width, height]);

    tree.separation(function(a, b) {
      return a.parent === b.parent ? 1 : 1;
    });

    var tree_nodes = tree.nodes(root);
    var links = tree.links(nodes);

    var svg = d3.select("#canvas-svg").append("svg")
        .attr("width", width)
        .attr("height", height);
    
    var tree_group = svg.append("g")
        .attr("id", "tree-group")

    tree_nodes.forEach(function(d) {
      d.y = d.depth * 100;
    });
    
    // define the nodes
    var i = 0;
    var x_ratio = 1;
    var y_ratio = 1;
    var y_padding = 50;
    var x_padding = 0;
    var minX = 999999, minY = 999999,
        maxX = 0, maxY = 0;
    var node = tree_group.selectAll(".node")
        .data(tree_nodes, function(d) { return d.id || (d.id = ++i); })
      .enter().append("g")
        .attr("class", function(d) {
          var cl = "circle";
          if (d.stages.length > 1) {
            cl = "pie";
          }
          return cl;
        })
        .attr("transform", function(d) {
          var x = d.x * x_ratio + x_padding,
              y = d.y * y_ratio + y_padding;
          
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
          
          return "translate(" + (x) + "," + (y) + ")";
        });

  var scaleX = 1, scaleY = 1;
  if (maxY - minY > height) scaleY = height / (maxY - minY);
  if (maxX - minX > width) scaleX = width / (maxX - minX);
  
  var scale = (scaleX < scaleY) ? scaleX : scaleY;
  tree_group.attr("transform", "scale(" + scale + ", " + scale * 0.9 + ")");

  var color = d3.scale.category20();
  var radius = 20;
  
  tree_group.append("marker")
    .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("id", "triangle")
    .attr("viewBox", "0 0 10 10")
    .attr("refX", "8")
    .attr("refY", "5")
    .attr("markerUnits", "strokeWidth")
    .attr("markerWidth", "8")
    .attr("markerHeight", "6")
    .attr("orient", "auto")
    .html('<path d="M 0 0 L 10 5 L 0 10 z"/>');
  
  var link = tree_group.selectAll("line")
        .data(links)
      .enter().insert("svg:line")
                .attr("marker-end", "url(#triangle)")
                .attr("x1", function(d) { return d.source.x * x_ratio + x_padding; })
                .attr("y1", function(d) { return d.source.y * y_ratio + radius + y_padding; })
                .attr("x2", function(d) { return d.target.x * x_ratio + x_padding; })
                .attr("y2", function(d) { return d.target.y * y_ratio - radius + y_padding; });
  
    // add circle nodes
    d3.selectAll("g.circle").append("circle")
        .attr("r", radius)
        .style("fill", function(d) {
          return color(d.stages[0]);
        });
  
    var arc = d3.svg.arc()
        .outerRadius(radius)
        .innerRadius(0);

    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) { return 10; });

    // add pie nodes
    d3.selectAll("g.pie").call(function(d) {
      for (var i = 0; i < d[0].length; i++) {
        var pie_arcs = d3.select(d[0][i]).selectAll(".arc")
            .data(pie(d.data()[i].stages))
            .enter().append("g")
            .attr("class", "arc");
      
        pie_arcs.append("path")
            .attr("d", arc)
            .style("fill", function(d) {
              return color(d.data);
            });
      }
    });

    // add the text 
    node.append("text")
        .attr("x", 25)
        .attr("dy", ".35em")
        .text(function(d) {
          return d.name.substring(d.name.indexOf("(") + 1, d.name.indexOf(")"));
        });
    
    // append legend
    var legend = svg.selectAll(".legend")
        .data(Object.keys(stagesData)).enter()
        .append("g").attr("class", "legend")
        .attr("transform", function(d, i) {
            return "translate(50," + (20 + i * 25) + ")";
        });

    legend.append("rect")
        .attr("x", width - 80)
        .attr("width", 18).attr("height", 18)
        .style("fill", function(d) {
            return color(d);
        });
    legend.append("text").attr("x", width - 90)
        .attr("y", 9).attr("dy", ".35em")
        .style("text-anchor", "end").text(function(d) {
            return "Stage " + d;
        });
  }

}