import React from 'react';
import PropTypes from 'prop-types';

import { compose } from 'redux';
import { connect } from 'react-redux';

import { DropTarget } from 'react-dnd';
import { updateTaskPosition } from 'api/tasks';
import throttle from 'lodash/throttle';

import { closeTaskWindow } from 'components/tasks/duck';

import DiagramTask from './DiagramTask';
import DiagramEdge from './DiagramEdge';
import ScrollHandler from './ScrollHandler';

import { diagramScrollTo } from './duck';

import './styles/diagram.css';

// 😀эмоджи!

const taskCoordinates = (props, monitor) => {
  const item = monitor.getItem();
  const delta = monitor.getDifferenceFromInitialOffset();
  const left = Math.round(item.left + delta.x);
  const top = Math.round(item.top + delta.y);
  return {
    id: item.id,
    left,
    top,
  };
};

const taskTarget = {
  drop(props, monitor, component) {
    component.dropTask(taskCoordinates(props, monitor, component));
  },
  hover(props, monitor, component) {
    component.moveTask(taskCoordinates(props, monitor, component));
    return true;
  },
};

const taskCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  dragging: !!monitor.getClientOffset(),
  hovered: monitor.isOver(),
  canDrop: monitor.canDrop(),
});

class Diagram extends React.Component {
  constructor(props) {
    super(props);
    this.moveTask = throttle(this.moveTask, 50);
    this.closeTask = this.closeTask.bind(this);
  }

  getPosition(taskId) {
    if (this.state && this.state.positions && this.state.positions[taskId]) {
      return this.state.positions[taskId];
    }
    return {};
  }

  movedEdgeProps(fromId, toId) {
    if (this.state && this.state.positions) {
      if (this.state.positions[fromId]) {
        return {
          fromLeft: this.state.positions[fromId].left,
          fromTop: this.state.positions[fromId].top,
        };
      } else if (this.state.positions[toId]) {
        return {
          toLeft: this.state.positions[toId].left,
          toTop: this.state.positions[toId].top,
        };
      }
    }
    return null;
  }

  moveTask({ id, left, top }) {
    this.setState({
      ...this.state,
      positions: {
        [id]: { left, top },
      },
    });
  }

  dropTask({ id, left, top }) {
    this.moveTask({ id, left, top });
    this.props.updateTaskPosition(id, { left, top });
  }

  closeTask() {
    closeTaskWindow.bind(this)();
    diagramScrollTo(this.props.scrollTo);
  }

  render() {
    const {
      connectDropTarget,
      dragging,
      tasks,
      currentTaskId,
      edges,
      canDrop,
      canEdit,
    } = this.props;
    const { closeTask } = this;
    return connectDropTarget(
      <div className={`diagram${(dragging ? ' diagram--dragging' : ' diagram--no-dragging')}`}>
        <div className="diagram__scroll">
          <ScrollHandler onClick={closeTask} />
          {
            tasks && tasks.map(task => (
              <DiagramTask
                key={`task${task.id}`}
                {...task}
                current={String(task.id) === String(currentTaskId)}
                {...this.getPosition(task.id)}
                canEdit={canEdit}
                onClose={closeTask}
              />
            ))
          }
          {
            edges && edges.map(edge => (
              <DiagramEdge
                id={edge.id}
                key={`edge${edge.id}`}
                from={edge.task_id}
                to={edge.dependent_task_id}
                {...this.movedEdgeProps(edge.task_id, edge.dependent_task_id)}
                canEdit={canEdit}
              />
            ))
          }
          <DiagramDragLayer canDrop={canDrop} />
        </div>
      </div>,
    );
  }
}

Diagram.propTypes = {
  connectDropTarget: PropTypes.func,
  dragging: PropTypes.bool,
  tasks: PropTypes.array,
  currentTaskId: PropTypes.number,
  edges: PropTypes.array,
  canDrop: PropTypes.bool,
  canEdit: PropTypes.bool,
  updateTaskPosition: PropTypes.func,
  scrollTo: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
  }),
};

const mapStateToProps = (state, ownProps) => ({
  ...ownProps,
  routing: state.routing.params,
  scrollTo: state.ui.diagram.scroll,
});

export default compose(
  connect(mapStateToProps, { updateTaskPosition }),
  DropTarget('DIAGRAM_TASK', taskTarget, taskCollect),
)(Diagram);
