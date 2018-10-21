var width = document.body.clientWidth
var height = document.body.clientHeight

var elem = document.getElementById('two');
var params = { width, height };
var two = new Two(params).appendTo(elem);

var x = width / 2
var y = height / 2
var linkWidth = 20
var linkHeight = 100
var linkRadius = linkWidth / 2.0

var groups = []
var rotations = []

const circleRadius = 3
const numJoints = 6

var baseGroup = new Two.Group()
baseGroup.translation._x = x
baseGroup.translation._y = y
groups.push(baseGroup)

function addGroup() {
    var lastGroup = groups[groups.length - 1].group
    var newGroup = new Two.Group()
    newGroup.translation._y = -linkHeight + linkRadius * 2
    lastGroup.add(newGroup)

    var newLink = new Two.RoundedRectangle(0, 0 - linkHeight / 2 + linkRadius,
                                           linkWidth,
                                           linkHeight,
                                           linkRadius);
    newLink.fill = 'transparent'
    newGroup.add(newLink)

    var axes = makeJointPoints()
    axes.forEach(function(el) {
      newGroup.add(el)
    })

    groups.push({
      group: newGroup,
      origin: axes[0],
      endPoint: axes[1]
    })

    newGroup.rotation = Math.PI / numJoints
    rotations.push(newGroup.rotation)

    two.update()
    rotations.push(0)
}

function getGlobalPosition(el) {

  var currentNode = el
  var currentMatrix = new Two.Matrix(...Two.Matrix.Identity)

  while (currentNode.parent && currentNode.parent._matrix) {
    currentNode = currentNode.parent
    currentMatrix = currentNode._matrix.clone().multiply(...currentMatrix.elements)
  }

  return currentMatrix.multiply(el.translation._x, el.translation._y, 1)

}

function toolDifferenceFromGroupWithRespectToOrigin(groupNum) {
  var origin = getGlobalPosition(groups[groupNum].origin)
  var tool = getGlobalPosition(getTool())
  return [tool.y - origin.y, origin.x - tool.x, 1]
}

// actually the transpose of the jacobian
function makeJacobian() {
  var arr = []
  for (var i = 0; i < groups.length; i++) {
    arr.push(toolDifferenceFromGroupWithRespectToOrigin(i))
  }

  return math.matrix(arr)
}

function calculateGradient(destination, scalar) {
  scalar = scalar || 1
  var jacobian = makeJacobian()
  var tool = getGlobalPosition(getTool())
  var delta = math.matrix([tool.x - destination[0], tool.y - destination[1], 1])

  var gradients = math.multiply(jacobian, math.transpose(delta))

  if (math.norm(gradients) < 5 || math.norm(delta) < 10) {
    console.log('scaling')
    scalar *= 5
  }

  return math.divide(gradients._data, math.norm(gradients) * scalar)
}

function applyGradient(gradient) {
  for (var i = 0; i < groups.length; i++) {
    groups[i].group.rotation += gradient[i]
  }
  two.update()
}

function moveToPoint(destination, scalar) {
  var gradient = calculateGradient(destination, scalar)
  applyGradient(gradient)
}

var interval = undefined;
const tolerance = 1
const speedScalar = 125

function goToPoint(e) {
  var destination = [e.clientX, e.clientY, 1]

  if (interval !== undefined) {
    clearInterval(interval)
  }

  interval = setInterval(function() {
    moveToPoint(destination, speedScalar)
    var toolPos = getGlobalPosition(getTool())
    var toolVec = [toolPos.x, toolPos.y]
    cursor._translation.x = destination[0]
    cursor._translation.y = destination[1]
    if (math.distance(toolVec, destination.slice(0, 2)) < tolerance) {
      clearInterval(interval)
    }
  }, 5)
}

var followMouse = true

document.body.onmousemove = function(e) {
  if (followMouse) {
    goToPoint(e)
  }
}

document.body.onmousedown = function(e) {
  if (!followMouse) {
    goToPoint(e)
  }
}

const lineSize = 14
const circleSize = 3

function makeJointPoints() {
  var rotationPoint = two.makeCircle(0, 0, circleSize)
  var endPoint = two.makeCircle(0, -linkHeight + linkRadius * 2, circleSize)

  rotationPoint.stroke = 'transparent'
  rotationPoint.fill = 'transparent'
  endPoint.stroke = 'transparent'
  endPoint.fill = 'blue'
  return [rotationPoint, endPoint]
}

function getTool() {
  return groups[groups.length - 1].endPoint
}

var base = new Two.RoundedRectangle(0, 0 - linkHeight / 2 + linkRadius,
                                           linkWidth,
                                           linkHeight,
                                           linkRadius);
base.fill = 'transparent'

var axes = makeJointPoints()
axes.forEach(function(el) {
  baseGroup.add(el)
})

baseGroup.add(base)
var groups = [{
  group: baseGroup,
  origin: axes[0],
  endPoint: axes[1]
}]

two.add(baseGroup)

groups[0].group.rotation = Math.PI / 3
rotations.push(groups[0].group.rotation)
two.update()

for (var i = 1; i < numJoints; i++) {
    addGroup()
}

var initialToolPos = getGlobalPosition(getTool())
var cursor = two.makeCircle(initialToolPos.x, initialToolPos.y, 3)
cursor.fill = "orange"